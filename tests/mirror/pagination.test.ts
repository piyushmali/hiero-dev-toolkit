import { describe, expect, it, vi } from "vitest";

import { MirrorClient } from "../../src/mirror/client";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("Mirror pagination", () => {
  it("iterates transactions across multiple pages", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("timestamp=lt%3A100")) {
        return jsonResponse({
          transactions: [{ transaction_id: "tx-2" }, { transaction_id: "tx-3" }],
          links: { next: null }
        });
      }

      return jsonResponse({
        transactions: [{ transaction_id: "tx-1" }],
        links: { next: "/api/v1/transactions?timestamp=lt:100&account.id=0.0.7" }
      });
    });

    const client = new MirrorClient({ fetcher: fetchSpy as unknown as typeof fetch, cache: false });

    const ids: string[] = [];
    for await (const tx of client.transactions().forAccount("0.0.7").limit(2)) {
      ids.push(tx.transaction_id);
    }

    expect(ids).toEqual(["tx-1", "tx-2", "tx-3"]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("fetches explicit pages using next links", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        transactions: [{ transaction_id: "tx-next" }],
        links: { next: null }
      })
    );

    const client = new MirrorClient({ fetcher: fetchSpy as unknown as typeof fetch, cache: false });

    const page = await client
      .transactions()
      .forAccount("0.0.9")
      .getPage("https://mainnet-public.mirrornode.hedera.com/api/v1/transactions?timestamp=lt:12");

    expect(page.transactions[0]?.transaction_id).toBe("tx-next");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("timestamp=lt:12");
  });
});
