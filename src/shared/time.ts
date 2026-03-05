/**
 * Promise-based sleep helper used by retries and polling loops.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Exponential backoff with bounded jitter.
 */
export function computeBackoffDelay(options: {
  attempt: number;
  baseMs: number;
  maxMs: number;
  jitterRatio: number;
}): number {
  const exponential = Math.min(options.baseMs * 2 ** options.attempt, options.maxMs);
  const jitterWindow = exponential * options.jitterRatio;
  const jitter = (Math.random() * 2 - 1) * jitterWindow;
  return Math.max(0, Math.round(exponential + jitter));
}
