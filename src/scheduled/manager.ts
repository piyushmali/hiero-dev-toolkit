import { sleep } from "../shared/time";
import type { MirrorSchedule } from "../mirror";

import { ScheduledTransactionError, ScheduledTransactionTimeoutError } from "./errors";
import { DefaultScheduleSdkAdapter } from "./sdk-adapter";
import type {
  CreateScheduleResult,
  ScheduleExecutionState,
  ScheduleInfo,
  ScheduleSdkAdapter,
  ScheduledTransactionManagerOptions,
  ScheduleSigner,
  WaitForExecutionResult
} from "./types";

/**
 * High-level orchestration manager for Hiero scheduled transactions.
 *
 * @example
 * ```ts
 * const manager = new ScheduledTransactionManager({ client, mirrorClient });
 * const result = await manager.create(innerTx, "0.0.1001", "Payroll", undefined, true);
 * ```
 */
export class ScheduledTransactionManager {
  private readonly sleepFn: (ms: number) => Promise<void>;
  private readonly adapter: ScheduleSdkAdapter;

  /**
   * Creates a manager with SDK client and Mirror Node dependencies.
   *
   * @param options Required clients and optional adapter overrides.
   */
  constructor(private readonly options: ScheduledTransactionManagerOptions) {
    this.sleepFn = options.sleepFn ?? sleep;
    this.adapter = options.adapter ?? new DefaultScheduleSdkAdapter(options.client);
  }

  /**
   * Creates a scheduled transaction.
   *
   * @param innerTx Frozen or schedulable inner transaction.
   * @param payerId Account ID paying for execution.
   * @param memo Optional schedule memo.
   * @param adminKey Optional admin key.
   * @param wait When true, waits for terminal execution.
   * @returns Schedule creation receipt and optional execution result.
   */
  async create(
    innerTx: unknown,
    payerId: string,
    memo?: string,
    adminKey?: string | unknown,
    wait = false
  ): Promise<CreateScheduleResult> {
    const created = await this.adapter.createSchedule({
      innerTx,
      payerId,
      memo,
      adminKey
    });

    if (!wait) {
      return created;
    }

    const execution = await this.waitForExecution(created.scheduleId);
    return {
      ...created,
      execution
    };
  }

  /**
   * Adds a signature for a schedule.
   *
   * @param scheduleId Schedule ID.
   * @param signer Private key string or signer object.
   * @returns SDK receipt or response.
   */
  async addSignature(scheduleId: string, signer: ScheduleSigner): Promise<unknown> {
    return this.adapter.addSignature(scheduleId, signer);
  }

  /**
   * Triggers schedule submission check and executes when ready.
   *
   * @param scheduleId Schedule ID.
   * @returns Current schedule info after submission attempt.
   */
  async submitWhenReady(scheduleId: string): Promise<ScheduleInfo> {
    const info = await this.getInfo(scheduleId);
    if (info.status === "Executed") {
      return info;
    }

    await this.adapter.submitSchedule(scheduleId);
    return this.getInfo(scheduleId);
  }

  /**
   * Polls schedule status until executed, failed, or expired.
   *
   * Poll strategy: starts at 2s, exponential increase, max 30s.
   *
   * @param scheduleId Schedule ID.
   * @param timeoutMs Max wait duration in milliseconds.
   * @returns Execution metadata including transaction ID and receipt payload.
   */
  async waitForExecution(scheduleId: string, timeoutMs = 120_000): Promise<WaitForExecutionResult> {
    const start = Date.now();
    let delay = 2_000;

    while (Date.now() - start <= timeoutMs) {
      const info = await this.getInfo(scheduleId);

      if (info.status === "Executed") {
        return {
          transactionId: info.transactionId ?? scheduleId,
          receipt: info
        };
      }

      if (info.status === "Failed" || info.status === "Expired") {
        throw new ScheduledTransactionError(
          `Schedule ${scheduleId} reached terminal state: ${info.status}`,
          { code: "TERMINAL_STATE" }
        );
      }

      await this.sleepFn(delay);
      delay = Math.min(Math.round(delay * 1.8), 30_000);
    }

    throw new ScheduledTransactionTimeoutError(
      `Timed out waiting for schedule ${scheduleId} execution after ${timeoutMs}ms`
    );
  }

  /**
   * Fetches enriched schedule metadata from Mirror Node and SDK.
   *
   * @param scheduleId Schedule ID.
   * @returns Normalized status metadata.
   */
  async getInfo(scheduleId: string): Promise<ScheduleInfo> {
    const [mirror, sdk] = await Promise.all([
      this.options.mirrorClient.getSchedule(scheduleId).catch(() => undefined),
      this.adapter.queryInfo(scheduleId).catch(() => undefined)
    ]);

    if (!mirror && !sdk) {
      throw new ScheduledTransactionError(`Unable to fetch schedule info for ${scheduleId}`, {
        code: "SCHEDULE_INFO_UNAVAILABLE"
      });
    }

    const status = deriveStatus(mirror);
    const transactionId = mirror?.transaction_id ?? extractSdkTransactionId(sdk);

    return {
      scheduleId,
      status,
      transactionId,
      executedAt: mirror?.executed_timestamp ?? extractSdkExecutedAt(sdk),
      expirationTime: mirror?.expiration_time,
      mirror,
      sdk
    };
  }
}

function deriveStatus(schedule?: MirrorSchedule): ScheduleExecutionState {
  if (!schedule) {
    return "Pending";
  }

  if (schedule.executed_timestamp) {
    return "Executed";
  }

  if (schedule.deleted) {
    return "Failed";
  }

  if (schedule.expiration_time) {
    const expiresAt = Date.parse(schedule.expiration_time);
    if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) {
      return "Expired";
    }
  }

  return "Pending";
}

function extractSdkTransactionId(sdk: unknown): string | undefined {
  if (!sdk || typeof sdk !== "object") {
    return undefined;
  }

  const candidate = (sdk as Record<string, unknown>).scheduledTransactionId;
  if (!candidate) {
    return undefined;
  }

  if (typeof candidate === "string") {
    return candidate;
  }

  if (typeof candidate === "object" && "toString" in candidate) {
    return (candidate as { toString: () => string }).toString();
  }

  return undefined;
}

function extractSdkExecutedAt(sdk: unknown): string | undefined {
  if (!sdk || typeof sdk !== "object") {
    return undefined;
  }

  const candidate = (sdk as Record<string, unknown>).executedAt;
  return typeof candidate === "string" ? candidate : undefined;
}
