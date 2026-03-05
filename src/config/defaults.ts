/**
 * Shared defaults that keep the toolkit production-safe out of the box.
 */
export const DEFAULT_MIRROR_BASE_URL = "https://mainnet-public.mirrornode.hedera.com";
export const DEFAULT_TIMEOUT_MS = 10_000;

export const DEFAULT_RETRY = {
  attempts: 4,
  backoffMs: 250,
  maxBackoffMs: 5_000,
  jitterRatio: 0.2
} as const;

export const DEFAULT_CIRCUIT_BREAKER = {
  failureThreshold: 5,
  cooldownMs: 30_000
} as const;

export const DEFAULT_CACHE = {
  ttlMs: 5 * 60 * 1_000,
  max: 500
} as const;

export const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
