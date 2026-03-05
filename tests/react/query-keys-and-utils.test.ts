import { describe, expect, it } from "vitest";

import { deriveScheduleState } from "../../src/react/utils";
import { hieroQueryKeys } from "../../src/react/query-keys";

describe("React hook utilities", () => {
  it("builds stable query keys", () => {
    expect(hieroQueryKeys.root()).toEqual(["hiero"]);
    expect(hieroQueryKeys.account("0.0.3")).toEqual(["hiero", "account", "0.0.3"]);
    expect(hieroQueryKeys.balance("0.0.3")).toEqual(["hiero", "balance", "0.0.3"]);
    expect(hieroQueryKeys.tokenBalances("0.0.3")).toEqual(["hiero", "token-balances", "0.0.3"]);
    expect(hieroQueryKeys.schedule("0.0.100")).toEqual(["hiero", "schedule", "0.0.100"]);
    expect(hieroQueryKeys.nft("0.0.200", 7)).toEqual(["hiero", "nft", "0.0.200", 7]);
    expect(hieroQueryKeys.transactions("0.0.3", 25, "desc")).toEqual([
      "hiero",
      "transactions",
      "0.0.3",
      25,
      "desc"
    ]);
  });

  it("derives executed schedule state", () => {
    expect(
      deriveScheduleState({
        schedule_id: "0.0.10",
        executed_timestamp: "123.1"
      })
    ).toBe("Executed");
  });

  it("derives failed schedule state", () => {
    expect(
      deriveScheduleState({
        schedule_id: "0.0.11",
        deleted: true
      })
    ).toBe("Failed");
  });

  it("derives expired schedule state", () => {
    expect(
      deriveScheduleState({
        schedule_id: "0.0.12",
        expiration_time: "2000-01-01T00:00:00.000Z"
      })
    ).toBe("Expired");
  });

  it("derives pending schedule state", () => {
    expect(
      deriveScheduleState({
        schedule_id: "0.0.13",
        expiration_time: "2999-01-01T00:00:00.000Z"
      })
    ).toBe("Pending");
  });
});
