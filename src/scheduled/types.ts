import type { Client } from "@hiero-ledger/sdk";

import type { MirrorClient, MirrorSchedule } from "../mirror";

/**
 * Signer that can sign a prepared SDK transaction.
 */
export interface TransactionSigner {
  signTransaction(transaction: unknown): Promise<unknown>;
}

export type ScheduleSigner = string | TransactionSigner;

export type ScheduleExecutionState = "Pending" | "Executed" | "Failed" | "Expired";

export interface ScheduleInfo {
  scheduleId: string;
  status: ScheduleExecutionState;
  transactionId?: string;
  executedAt?: string;
  expirationTime?: string;
  mirror?: MirrorSchedule;
  sdk?: unknown;
}

export interface WaitForExecutionResult {
  transactionId: string;
  receipt: unknown;
}

export interface CreateScheduleResult {
  scheduleId: string;
  receipt: unknown;
  transactionId?: string;
  execution?: WaitForExecutionResult;
}

export interface ScheduleSdkAdapter {
  createSchedule(input: {
    innerTx: unknown;
    payerId: string;
    memo?: string;
    adminKey?: string | unknown;
  }): Promise<{ scheduleId: string; receipt: unknown; transactionId?: string }>;

  addSignature(scheduleId: string, signer: ScheduleSigner): Promise<unknown>;

  submitSchedule(scheduleId: string): Promise<unknown>;

  queryInfo(scheduleId: string): Promise<unknown>;
}

export interface ScheduledTransactionManagerOptions {
  client: Client;
  mirrorClient: MirrorClient;
  adapter?: ScheduleSdkAdapter;
  sleepFn?: (ms: number) => Promise<void>;
}
