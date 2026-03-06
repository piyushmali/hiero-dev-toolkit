"use client";

import { useMemo, useState } from "react";

import {
  useHieroBalance,
  useInfiniteTransactions,
  useNftMetadata,
  useTokenBalances
} from "@piyushmali/hiero-toolkit";

export function Dashboard(): JSX.Element {
  const [accountId, setAccountId] = useState("0.0.1001");
  const [tokenId, setTokenId] = useState("0.0.0");
  const [serial, setSerial] = useState(1);

  const balanceQuery = useHieroBalance(accountId);
  const tokenBalancesQuery = useTokenBalances(accountId);
  const txQuery = useInfiniteTransactions(accountId, { pageSize: 20 });
  const nftQuery = useNftMetadata(tokenId, serial, {
    enabled: tokenId !== "0.0.0"
  });

  const transactions = useMemo(
    () => txQuery.data?.pages.flatMap((page) => page.transactions) ?? [],
    [txQuery.data]
  );

  return (
    <main>
      <h1>Hiero Toolkit Next.js Demo</h1>
      <small>Account balance, infinite transactions, and NFT metadata powered by toolkit hooks.</small>

      <div className="grid">
        <section className="card">
          <h2>Account Balance</h2>
          <div className="row" style={{ marginTop: 10 }}>
            <input value={accountId} onChange={(event) => setAccountId(event.target.value)} />
          </div>
          <p>
            HBAR balance: <strong>{balanceQuery.data ?? "-"}</strong>
          </p>
          <small>{balanceQuery.isFetching ? "Refreshing..." : "Live from Mirror Node"}</small>
        </section>

        <section className="card">
          <h2>Infinite Transactions</h2>
          <ul>
            {transactions.map((tx) => (
              <li key={`${tx.transaction_id}:${tx.consensus_timestamp ?? "na"}`}>
                {tx.transaction_id} {tx.result ? `(${tx.result})` : ""}
              </li>
            ))}
          </ul>
          <div className="row" style={{ marginTop: 10 }}>
            <button
              onClick={() => txQuery.fetchNextPage()}
              disabled={!txQuery.hasNextPage || txQuery.isFetchingNextPage}
            >
              {txQuery.isFetchingNextPage ? "Loading..." : txQuery.hasNextPage ? "Load more" : "No more"}
            </button>
          </div>
        </section>

        <section className="card">
          <h2>NFT Metadata</h2>
          <div className="row" style={{ marginTop: 10 }}>
            <input value={tokenId} onChange={(event) => setTokenId(event.target.value)} />
            <input
              type="number"
              min={1}
              value={serial}
              onChange={(event) => setSerial(Number(event.target.value || 1))}
            />
          </div>
          <pre>{JSON.stringify(nftQuery.data ?? { note: "Enter valid token + serial" }, null, 2)}</pre>
        </section>

        <section className="card">
          <h2>Token Balances</h2>
          <pre>{JSON.stringify(tokenBalancesQuery.data ?? [], null, 2)}</pre>
        </section>
      </div>
    </main>
  );
}
