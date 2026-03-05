/**
 * Base error for scheduled transaction orchestration.
 */
export class ScheduledTransactionError extends Error {
  readonly code?: string;
  readonly cause?: unknown;

  constructor(message: string, options?: { code?: string; cause?: unknown }) {
    super(message);
    this.name = "ScheduledTransactionError";
    this.code = options?.code;
    this.cause = options?.cause;
  }
}

/**
 * Raised when waiting for schedule execution times out.
 */
export class ScheduledTransactionTimeoutError extends ScheduledTransactionError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: "TIMEOUT", cause });
    this.name = "ScheduledTransactionTimeoutError";
  }
}
