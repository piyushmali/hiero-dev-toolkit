import { describe, expect, it, vi } from "vitest";

import { ScheduledTransactionError, ScheduledTransactionTimeoutError } from "../../src/scheduled/errors";
import { ScheduledTransactionManager } from "../../src/scheduled/manager";
import type { ScheduleSdkAdapter } from "../../src/scheduled/types";

function pendingSchedule(scheduleId: string) {
  return {
    schedule_id: scheduleId,
    expiration_time: new Date(Date.now() + 60_000).toISOString()
  };
}

function executedSchedule(scheduleId: string) {
  return {
    schedule_id: scheduleId,
    transaction_id: "0.0.500@123.4",
    executed_timestamp: "123.5",
    expiration_time: new Date(Date.now() + 60_000).toISOString()
  };
}

describe("ScheduledTransactionManager", () => {
  it("creates and waits for execution when wait=true", async () => {
    const adapter: ScheduleSdkAdapter = {
      createSchedule: vi.fn().mockResolvedValue({
        scheduleId: "0.0.500",
        receipt: { status: "SUCCESS" },
        transactionId: "0.0.500@123.4"
      }),
      addSignature: vi.fn(),
      submitSchedule: vi.fn(),
      queryInfo: vi.fn().mockResolvedValue({})
    };

    const mirrorClient = {
      getSchedule: vi
        .fn()
        .mockResolvedValueOnce(pendingSchedule("0.0.500"))
        .mockResolvedValueOnce(executedSchedule("0.0.500"))
    };

    const sleepFn = vi.fn(async () => Promise.resolve());

    const manager = new ScheduledTransactionManager({
      client: {} as never,
      mirrorClient: mirrorClient as never,
      adapter,
      sleepFn
    });

    const result = await manager.create({}, "0.0.1001", "test memo", undefined, true);

    expect(result.scheduleId).toBe("0.0.500");
    expect(result.execution?.transactionId).toBe("0.0.500@123.4");
    expect(sleepFn).toHaveBeenCalledTimes(1);
  });

  it("times out if schedule never executes", async () => {
    const adapter: ScheduleSdkAdapter = {
      createSchedule: vi.fn(),
      addSignature: vi.fn(),
      submitSchedule: vi.fn(),
      queryInfo: vi.fn().mockResolvedValue({})
    };

    const mirrorClient = {
      getSchedule: vi.fn().mockResolvedValue(pendingSchedule("0.0.600"))
    };

    const manager = new ScheduledTransactionManager({
      client: {} as never,
      mirrorClient: mirrorClient as never,
      adapter,
      sleepFn: async () => Promise.resolve()
    });

    await expect(manager.waitForExecution("0.0.600", 0)).rejects.toBeInstanceOf(
      ScheduledTransactionTimeoutError
    );
  });

  it("does not submit again when already executed", async () => {
    const adapter: ScheduleSdkAdapter = {
      createSchedule: vi.fn(),
      addSignature: vi.fn(),
      submitSchedule: vi.fn(),
      queryInfo: vi.fn().mockResolvedValue({})
    };

    const mirrorClient = {
      getSchedule: vi.fn().mockResolvedValue(executedSchedule("0.0.700"))
    };

    const manager = new ScheduledTransactionManager({
      client: {} as never,
      mirrorClient: mirrorClient as never,
      adapter
    });

    const info = await manager.submitWhenReady("0.0.700");

    expect(info.status).toBe("Executed");
    expect(adapter.submitSchedule).not.toHaveBeenCalled();
  });

  it("delegates signature collection to adapter", async () => {
    const adapter: ScheduleSdkAdapter = {
      createSchedule: vi.fn(),
      addSignature: vi.fn().mockResolvedValue({ status: "SIGNED" }),
      submitSchedule: vi.fn(),
      queryInfo: vi.fn()
    };

    const mirrorClient = {
      getSchedule: vi.fn()
    };

    const manager = new ScheduledTransactionManager({
      client: {} as never,
      mirrorClient: mirrorClient as never,
      adapter
    });

    await manager.addSignature("0.0.900", "302e020100300506032b657004220420example");

    expect(adapter.addSignature).toHaveBeenCalledWith(
      "0.0.900",
      "302e020100300506032b657004220420example"
    );
  });

  it("falls back to sdk info when mirror info is unavailable", async () => {
    const adapter: ScheduleSdkAdapter = {
      createSchedule: vi.fn(),
      addSignature: vi.fn(),
      submitSchedule: vi.fn(),
      queryInfo: vi.fn().mockResolvedValue({
        scheduledTransactionId: {
          toString: () => "0.0.901@123.9"
        },
        executedAt: "123.10"
      })
    };

    const mirrorClient = {
      getSchedule: vi.fn().mockRejectedValue(new Error("mirror unavailable"))
    };

    const manager = new ScheduledTransactionManager({
      client: {} as never,
      mirrorClient: mirrorClient as never,
      adapter
    });

    const info = await manager.getInfo("0.0.901");

    expect(info.status).toBe("Pending");
    expect(info.transactionId).toBe("0.0.901@123.9");
    expect(info.executedAt).toBe("123.10");
  });

  it("throws when schedule info is unavailable from mirror and sdk", async () => {
    const adapter: ScheduleSdkAdapter = {
      createSchedule: vi.fn(),
      addSignature: vi.fn(),
      submitSchedule: vi.fn(),
      queryInfo: vi.fn().mockRejectedValue(new Error("sdk unavailable"))
    };

    const mirrorClient = {
      getSchedule: vi.fn().mockRejectedValue(new Error("mirror unavailable"))
    };

    const manager = new ScheduledTransactionManager({
      client: {} as never,
      mirrorClient: mirrorClient as never,
      adapter
    });

    await expect(manager.getInfo("0.0.902")).rejects.toBeInstanceOf(ScheduledTransactionError);
  });
});
