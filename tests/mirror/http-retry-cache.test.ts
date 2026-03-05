import { describe, expect, it, vi } from "vitest";

import { MirrorClient } from "../../src/mirror/client";
import { MirrorNodeRateLimitError } from "../../src/mirror/errors";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers
    }
  });
}

describe("Mirror HTTP reliability", () => {
  it("retries on retryable status then succeeds", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "temporary" }, 503))
      .mockResolvedValueOnce(jsonResponse({ account: "0.0.3" }, 200));

    const client = new MirrorClient({
      fetcher: fetchSpy as unknown as typeof fetch,
      retry: { attempts: 2, backoffMs: 1, maxBackoffMs: 2, jitterRatio: 0 },
      cache: false
    });

    const account = await client.getAccount("0.0.3");

    expect(account.account).toBe("0.0.3");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("throws MirrorNodeRateLimitError for 429 responses", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ error: "rate limited" }, 429, {
        "retry-after": "2"
      })
    );

    const client = new MirrorClient({
      fetcher: fetchSpy as unknown as typeof fetch,
      retry: { attempts: 0 },
      cache: false
    });

    const error = await client.getAccount("0.0.3").catch((caught) => caught);
    expect(error).toBeInstanceOf(MirrorNodeRateLimitError);
    expect(error).toMatchObject({ retryAfterMs: 2_000 });
  });

  it("caches GET responses with default cache policy", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ account: "0.0.7" }));

    const client = new MirrorClient({
      fetcher: fetchSpy as unknown as typeof fetch,
      cache: true,
      retry: { attempts: 0 }
    });

    await client.getAccount("0.0.7");
    await client.getAccount("0.0.7");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("opens circuit breaker after repeated retryable failures", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ error: "down" }, 503));

    const client = new MirrorClient({
      fetcher: fetchSpy as unknown as typeof fetch,
      cache: false,
      retry: { attempts: 0 },
      circuitBreaker: { failureThreshold: 2, cooldownMs: 60_000 }
    });

    await expect(client.getAccount("0.0.9")).rejects.toBeDefined();
    await expect(client.getAccount("0.0.9")).rejects.toBeDefined();
    await expect(client.getAccount("0.0.9")).rejects.toMatchObject({ code: "CIRCUIT_OPEN" });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
