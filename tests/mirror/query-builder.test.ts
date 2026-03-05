import { describe, expect, it, vi } from "vitest";

import { MirrorClient } from "../../src/mirror/client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("Mirror query builders", () => {
  it("builds single-account query with balance enrichment", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          account: "0.0.3",
          balance: { balance: 10, timestamp: "123.4" }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          balances: [{ account: "0.0.3", balance: 25 }],
          timestamp: "123.5",
          links: { next: null }
        })
      );

    const client = new MirrorClient({ fetcher: fetchSpy as unknown as typeof fetch, cache: false });
    const result = await client.accounts().byId("0.0.3").includeBalance().get();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      account: "0.0.3",
      balance: { balance: 25, timestamp: "123.5" }
    });
  });

  it("builds transactions query with account, limit, and order", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        transactions: [{ transaction_id: "0.0.100@123.4" }],
        links: { next: null }
      })
    );

    const client = new MirrorClient({ fetcher: fetchSpy as unknown as typeof fetch, cache: false });
    await client.transactions().forAccount("0.0.100").limit(100).order("desc").get();

    const calledUrl = String(fetchSpy.mock.calls[0]?.[0]);
    const parsed = new URL(calledUrl);

    expect(parsed.pathname).toBe("/api/v1/transactions");
    expect(parsed.searchParams.get("account.id")).toBe("0.0.100");
    expect(parsed.searchParams.get("limit")).toBe("100");
    expect(parsed.searchParams.get("order")).toBe("desc");
  });

  it("supports account search list queries", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        accounts: [{ account: "0.0.120" }],
        links: { next: null }
      })
    );

    const client = new MirrorClient({ fetcher: fetchSpy as unknown as typeof fetch, cache: false });
    const list = await client.accounts().search("0.0.12").limit(5).order("asc").getList();

    const calledUrl = String(fetchSpy.mock.calls[0]?.[0]);
    const parsed = new URL(calledUrl);

    expect(parsed.pathname).toBe("/api/v1/accounts");
    expect(parsed.searchParams.get("account.id")).toBe("0.0.12");
    expect(parsed.searchParams.get("limit")).toBe("5");
    expect(parsed.searchParams.get("order")).toBe("asc");
    expect(list.accounts).toHaveLength(1);
  });

  it("returns recent transactions through convenience method", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        transactions: [{ transaction_id: "0.0.100@123.4", result: "SUCCESS" }],
        links: { next: null }
      })
    );

    const client = new MirrorClient({ fetcher: fetchSpy as unknown as typeof fetch, cache: false });
    const txs = await client.getRecentTransactions("0.0.100", 1);

    expect(txs[0]?.transaction_id).toBe("0.0.100@123.4");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
