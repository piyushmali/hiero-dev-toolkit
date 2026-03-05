import { LRUCache } from "lru-cache";
import { ZodError, type ZodType } from "zod";

import {
  DEFAULT_CACHE,
  DEFAULT_CIRCUIT_BREAKER,
  DEFAULT_MIRROR_BASE_URL,
  DEFAULT_RETRY,
  DEFAULT_TIMEOUT_MS,
  RETRYABLE_STATUS_CODES
} from "../config/defaults";
import { computeBackoffDelay, sleep } from "../shared/time";
import {
  MirrorNodeError,
  MirrorNodeRateLimitError,
  MirrorNodeValidationError
} from "./errors";
import type {
  MirrorCacheOptions,
  MirrorCircuitBreakerOptions,
  MirrorClientOptions,
  MirrorRetryOptions
} from "./types";

type QueryValue = string | number | boolean | null | undefined;

interface ResolvedMirrorHttpOptions {
  baseUrl: string;
  timeoutMs: number;
  retry: MirrorRetryOptions;
  cache: MirrorCacheOptions | false;
  circuitBreaker: MirrorCircuitBreakerOptions;
  fetcher: typeof fetch;
}

/**
 * Low-level HTTP transport with retries, cache, and circuit breaker protections.
 */
export class MirrorHttpClient {
  private readonly options: ResolvedMirrorHttpOptions;
  private readonly cache?: LRUCache<string, {}>;
  private consecutiveFailures = 0;
  private circuitOpenedAt?: number;

  constructor(options: MirrorClientOptions = {}) {
    this.options = {
      baseUrl: sanitizeBaseUrl(options.baseUrl ?? DEFAULT_MIRROR_BASE_URL),
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      retry: {
        attempts: options.retry?.attempts ?? DEFAULT_RETRY.attempts,
        backoffMs: options.retry?.backoffMs ?? DEFAULT_RETRY.backoffMs,
        maxBackoffMs: options.retry?.maxBackoffMs ?? DEFAULT_RETRY.maxBackoffMs,
        jitterRatio: options.retry?.jitterRatio ?? DEFAULT_RETRY.jitterRatio
      },
      cache: resolveCacheOptions(options.cache),
      circuitBreaker: {
        failureThreshold:
          options.circuitBreaker?.failureThreshold ?? DEFAULT_CIRCUIT_BREAKER.failureThreshold,
        cooldownMs: options.circuitBreaker?.cooldownMs ?? DEFAULT_CIRCUIT_BREAKER.cooldownMs
      },
      fetcher: options.fetcher ?? fetch
    };

    if (this.options.cache) {
      this.cache = new LRUCache<string, {}>({
        ttl: this.options.cache.ttlMs,
        max: this.options.cache.max
      });
    }
  }

  /**
   * Performs a GET request with full reliability and runtime validation.
   *
   * @example
   * ```ts
   * const account = await http.get(
   *   "/api/v1/accounts/0.0.3",
   *   accountSchema
   * );
   * ```
   *
   * @param pathOrUrl Relative path (recommended) or absolute URL.
   * @param validator Zod schema used to validate the response payload.
   * @param queryParams Optional query parameters.
   * @returns Validated JSON payload.
   */
  async get<T>(
    pathOrUrl: string,
    validator: ZodType<T>,
    queryParams?: Record<string, QueryValue>
  ): Promise<T> {
    const url = this.buildUrl(pathOrUrl, queryParams);
    const cacheKey = `GET:${url.toString()}`;

    if (this.cache?.has(cacheKey)) {
      return this.cache.get(cacheKey) as T;
    }

    const payload = await this.fetchWithRetry(url);

    try {
      const parsed = validator.parse(payload);
      this.cache?.set(cacheKey, parsed as {});
      return parsed;
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw new MirrorNodeValidationError(
          `Mirror Node response did not match expected shape for ${url.pathname}`,
          error
        );
      }
      throw error;
    }
  }

  private buildUrl(pathOrUrl: string, queryParams?: Record<string, QueryValue>): URL {
    const url = pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")
      ? new URL(pathOrUrl)
      : new URL(pathOrUrl, this.options.baseUrl);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url;
  }

  private async fetchWithRetry(url: URL): Promise<unknown> {
    if (this.isCircuitOpen()) {
      throw new MirrorNodeError("Mirror Node circuit is open. Requests are temporarily paused.", {
        status: 503,
        code: "CIRCUIT_OPEN"
      });
    }

    const maxAttempts = Math.max(0, this.options.retry.attempts);
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), this.options.timeoutMs);

      try {
        const response = await this.options.fetcher(url.toString(), {
          method: "GET",
          signal: controller.signal,
          headers: {
            Accept: "application/json"
          }
        });

        clearTimeout(timeoutHandle);

        if (!response.ok) {
          const error = await this.toHttpError(response, url);
          this.registerFailure(error);

          if (shouldRetry(response.status) && attempt < maxAttempts) {
            await sleep(
              computeBackoffDelay({
                attempt,
                baseMs: this.options.retry.backoffMs,
                maxMs: this.options.retry.maxBackoffMs,
                jitterRatio: this.options.retry.jitterRatio
              })
            );
            continue;
          }

          throw error;
        }

        const json = (await response.json()) as unknown;
        this.resetFailures();
        return json;
      } catch (error: unknown) {
        clearTimeout(timeoutHandle);
        lastError = error;

        if (error instanceof MirrorNodeError) {
          if (attempt < maxAttempts && error.status && shouldRetry(error.status)) {
            await sleep(
              computeBackoffDelay({
                attempt,
                baseMs: this.options.retry.backoffMs,
                maxMs: this.options.retry.maxBackoffMs,
                jitterRatio: this.options.retry.jitterRatio
              })
            );
            continue;
          }
          throw error;
        }

        const wrapped = new MirrorNodeError(
          `Mirror Node request failed for ${url.toString()}`,
          {
            code: "NETWORK_ERROR",
            cause: error
          }
        );

        this.registerFailure(wrapped);

        if (attempt < maxAttempts) {
          await sleep(
            computeBackoffDelay({
              attempt,
              baseMs: this.options.retry.backoffMs,
              maxMs: this.options.retry.maxBackoffMs,
              jitterRatio: this.options.retry.jitterRatio
            })
          );
          continue;
        }

        throw wrapped;
      }
    }

    throw (
      lastError ??
      new MirrorNodeError(`Mirror Node request failed for ${url.toString()}`, {
        code: "UNKNOWN_ERROR"
      })
    );
  }

  private async toHttpError(response: Response, url: URL): Promise<MirrorNodeError> {
    const message = `Mirror Node responded with status ${response.status} for ${url.pathname}`;

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1_000 : undefined;
      return new MirrorNodeRateLimitError(message, { retryAfterMs });
    }

    let bodyText: string | undefined;
    try {
      bodyText = await response.text();
    } catch {
      bodyText = undefined;
    }

    return new MirrorNodeError(bodyText ? `${message}: ${bodyText}` : message, {
      status: response.status,
      code: "HTTP_ERROR"
    });
  }

  private registerFailure(error: MirrorNodeError): void {
    if (error.status && !shouldRetry(error.status)) {
      return;
    }

    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.options.circuitBreaker.failureThreshold) {
      this.circuitOpenedAt = Date.now();
    }
  }

  private resetFailures(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenedAt = undefined;
  }

  private isCircuitOpen(): boolean {
    if (!this.circuitOpenedAt) {
      return false;
    }

    const elapsed = Date.now() - this.circuitOpenedAt;
    if (elapsed >= this.options.circuitBreaker.cooldownMs) {
      this.resetFailures();
      return false;
    }

    return true;
  }
}

function resolveCacheOptions(value: MirrorClientOptions["cache"]): MirrorCacheOptions | false {
  if (value === false) {
    return false;
  }

  if (value === undefined || value === true) {
    return {
      ttlMs: DEFAULT_CACHE.ttlMs,
      max: DEFAULT_CACHE.max
    };
  }

  return {
    ttlMs: value.ttlMs ?? DEFAULT_CACHE.ttlMs,
    max: value.max ?? DEFAULT_CACHE.max
  };
}

function sanitizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function shouldRetry(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}
