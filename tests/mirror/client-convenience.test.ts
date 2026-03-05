import { describe, expect, it, vi } from "vitest";

import { MirrorClient } from "../../src/mirror/client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("MirrorClient convenience methods", () => {
  it("fetches balance and token balances", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          balances: [{ account: "0.0.100", balance: 123 }],
          timestamp: "123.1",
          links: { next: null }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          tokens: [{ token_id: "0.0.200", balance: 50 }],
          links: { next: null }
        })
      );

    const client = new MirrorClient({ fetcher: fetchSpy as unknown as typeof fetch, cache: false });

    const balance = await client.getBalance("0.0.100");
    const tokenBalances = await client.getTokenBalances("0.0.100");

    expect(balance).toBe(123);
    expect(tokenBalances).toEqual([{ token_id: "0.0.200", balance: 50 }]);
  });

  it("fetches nft info, schedule info, and topic messages", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          token_id: "0.0.300",
          serial_number: 1,
          metadata: "AQID"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          schedule_id: "0.0.400",
          transaction_id: "0.0.500@123.4"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          messages: [
            {
              consensus_timestamp: "123.5",
              message: "SGVsbG8=",
              running_hash: "hash",
              sequence_number: 1,
              topic_id: "0.0.600"
            }
          ],
          links: { next: null }
        })
      );

    const client = new MirrorClient({ fetcher: fetchSpy as unknown as typeof fetch, cache: false });

    const nftInfo = await client.getNftInfo("0.0.300", 1);
    const schedule = await client.getSchedule("0.0.400");
    const topicMessages = await client.getTopicMessages("0.0.600", 10);

    expect(nftInfo.serial_number).toBe(1);
    expect(schedule.schedule_id).toBe("0.0.400");
    expect(topicMessages.messages).toHaveLength(1);

    const topicCallUrl = new URL(String(fetchSpy.mock.calls[2]?.[0]));
    expect(topicCallUrl.pathname).toBe("/api/v1/topics/0.0.600/messages");
    expect(topicCallUrl.searchParams.get("limit")).toBe("10");
    expect(topicCallUrl.searchParams.get("order")).toBe("desc");
  });

  it("searches accounts via fluent builder", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        accounts: [{ account: "0.0.700" }],
        links: { next: null }
      })
    );

    const client = new MirrorClient({ fetcher: fetchSpy as unknown as typeof fetch, cache: false });
    const results = await client.searchAccounts("0.0.70");

    expect(results).toEqual([{ account: "0.0.700" }]);

    const calledUrl = new URL(String(fetchSpy.mock.calls[0]?.[0]));
    expect(calledUrl.pathname).toBe("/api/v1/accounts");
    expect(calledUrl.searchParams.get("account.id")).toBe("0.0.70");
    expect(calledUrl.searchParams.get("limit")).toBe("25");
  });
});
