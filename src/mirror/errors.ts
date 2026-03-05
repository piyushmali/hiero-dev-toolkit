/**
 * Base error for all Mirror Node client failures.
 */
export class MirrorNodeError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly cause?: unknown;

  constructor(message: string, options?: { status?: number; code?: string; cause?: unknown }) {
    super(message);
    this.name = "MirrorNodeError";
    this.status = options?.status;
    this.code = options?.code;
    this.cause = options?.cause;
  }
}

/**
 * Raised when runtime response validation fails.
 */
export class MirrorNodeValidationError extends MirrorNodeError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: "VALIDATION_ERROR", cause });
    this.name = "MirrorNodeValidationError";
  }
}

/**
 * Raised for Mirror Node rate limiting responses.
 */
export class MirrorNodeRateLimitError extends MirrorNodeError {
  readonly retryAfterMs?: number;

  constructor(message: string, options?: { retryAfterMs?: number; cause?: unknown }) {
    super(message, { status: 429, code: "RATE_LIMITED", cause: options?.cause });
    this.name = "MirrorNodeRateLimitError";
    this.retryAfterMs = options?.retryAfterMs;
  }
}
