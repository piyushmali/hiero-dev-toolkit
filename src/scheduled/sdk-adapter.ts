import type { Client } from "@hiero-ledger/sdk";

import { ScheduledTransactionError } from "./errors";
import type { ScheduleSdkAdapter, ScheduleSigner, TransactionSigner } from "./types";

/**
 * Default adapter that drives schedule operations through `@hiero-ledger/sdk`.
 */
export class DefaultScheduleSdkAdapter implements ScheduleSdkAdapter {
  constructor(private readonly client: Client) {}

  async createSchedule(input: {
    innerTx: unknown;
    payerId: string;
    memo?: string;
    adminKey?: string | unknown;
  }): Promise<{ scheduleId: string; receipt: unknown; transactionId?: string }> {
    const sdk = await this.loadSdk();
    const ScheduleCreateTransaction = sdk.ScheduleCreateTransaction;
    const AccountId = sdk.AccountId as { fromString?: (value: string) => unknown } | undefined;

    this.assertClass("ScheduleCreateTransaction", ScheduleCreateTransaction);
    if (!AccountId?.fromString) {
      throw new ScheduledTransactionError("SDK class AccountId is unavailable", {
        code: "SDK_CLASS_MISSING"
      });
    }

    const transaction = new ScheduleCreateTransaction()
      .setScheduledTransaction(input.innerTx)
      .setPayerAccountId(AccountId.fromString(input.payerId));

    if (input.memo) {
      transaction.setScheduleMemo(input.memo);
    }

    if (input.adminKey) {
      const key = this.resolveAdminKey(input.adminKey, sdk);
      transaction.setAdminKey(key);
    }

    const frozen = transaction.freezeWith ? await transaction.freezeWith(this.client) : transaction;
    const response = await frozen.execute(this.client);
    const receipt = await response.getReceipt(this.client);

    const scheduleId = stringifyId(receipt?.scheduleId);
    if (!scheduleId) {
      throw new ScheduledTransactionError("SDK receipt did not contain a schedule ID", {
        code: "MISSING_SCHEDULE_ID"
      });
    }

    return {
      scheduleId,
      receipt,
      transactionId: stringifyId(response?.transactionId)
    };
  }

  async addSignature(scheduleId: string, signer: ScheduleSigner): Promise<unknown> {
    const sdk = await this.loadSdk();
    const tx = await this.newScheduleSignTransaction(scheduleId, sdk);

    const signed = await this.applySignature(tx, signer, sdk);
    const response = await signed.execute(this.client);
    return response.getReceipt?.(this.client) ?? response;
  }

  async submitSchedule(scheduleId: string): Promise<unknown> {
    const sdk = await this.loadSdk();
    const tx = await this.newScheduleSignTransaction(scheduleId, sdk);

    // `execute(client)` is expected to sign with operator and trigger readiness check.
    const response = await tx.execute(this.client);
    return response.getReceipt?.(this.client) ?? response;
  }

  async queryInfo(scheduleId: string): Promise<unknown> {
    const sdk = await this.loadSdk();
    const ScheduleInfoQuery = sdk.ScheduleInfoQuery;

    this.assertClass("ScheduleInfoQuery", ScheduleInfoQuery);

    const query = new ScheduleInfoQuery().setScheduleId(this.parseScheduleId(scheduleId, sdk));
    return query.execute(this.client);
  }

  private async newScheduleSignTransaction(scheduleId: string, sdk: Record<string, unknown>): Promise<any> {
    const ScheduleSignTransaction = sdk.ScheduleSignTransaction;
    this.assertClass("ScheduleSignTransaction", ScheduleSignTransaction);

    const tx = new ScheduleSignTransaction().setScheduleId(this.parseScheduleId(scheduleId, sdk));
    return tx.freezeWith ? tx.freezeWith(this.client) : tx;
  }

  private parseScheduleId(scheduleId: string, sdk: Record<string, unknown>): unknown {
    const ScheduleId = sdk.ScheduleId as { fromString?: (value: string) => unknown } | undefined;
    return ScheduleId?.fromString ? ScheduleId.fromString(scheduleId) : scheduleId;
  }

  private async applySignature(
    transaction: any,
    signer: ScheduleSigner,
    sdk: Record<string, unknown>
  ): Promise<any> {
    if (typeof signer === "string") {
      const PrivateKey = sdk.PrivateKey as { fromString?: (value: string) => any } | undefined;
      if (!PrivateKey?.fromString) {
        throw new ScheduledTransactionError("PrivateKey.fromString is unavailable in SDK", {
          code: "MISSING_PRIVATE_KEY"
        });
      }

      const key = PrivateKey.fromString(signer);
      return key.signTransaction(transaction);
    }

    if (!isTransactionSigner(signer)) {
      throw new ScheduledTransactionError("Invalid signer supplied", {
        code: "INVALID_SIGNER"
      });
    }

    return signer.signTransaction(transaction);
  }

  private resolveAdminKey(adminKey: string | unknown, sdk: Record<string, unknown>): unknown {
    if (typeof adminKey !== "string") {
      return adminKey;
    }

    const PublicKey = sdk.PublicKey as { fromString?: (value: string) => unknown } | undefined;
    if (PublicKey?.fromString) {
      return PublicKey.fromString(adminKey);
    }

    return adminKey;
  }

  private assertClass(name: string, value: unknown): asserts value is new (...args: unknown[]) => any {
    if (typeof value !== "function") {
      throw new ScheduledTransactionError(`SDK class ${name} is unavailable`, {
        code: "SDK_CLASS_MISSING"
      });
    }
  }

  private async loadSdk(): Promise<Record<string, any>> {
    const sdk = (await import("@hiero-ledger/sdk")) as unknown as Record<string, any>;
    return sdk;
  }
}

function isTransactionSigner(value: unknown): value is TransactionSigner {
  return (
    typeof value === "object" &&
    value !== null &&
    "signTransaction" in value &&
    typeof (value as TransactionSigner).signTransaction === "function"
  );
}

function stringifyId(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "toString" in value) {
    const maybeId = (value as { toString: () => string }).toString();
    return maybeId || undefined;
  }

  return undefined;
}
