# @hiero-dev/toolkit

[![npm version](https://img.shields.io/npm/v/@hiero-dev/toolkit.svg)](https://www.npmjs.com/package/@hiero-dev/toolkit)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)
[![CI](https://github.com/hiero-dev/toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/hiero-dev/toolkit/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-%3E80%25-brightgreen)](./coverage)

Modern, production-minded TypeScript utilities for Hiero networks.

`@hiero-dev/toolkit` combines:
- A typed Mirror Node client with fluent builders and async pagination.
- A scheduled transaction manager with enterprise reliability patterns.
- A React / Next.js integration kit on top of TanStack Query.

Built to feel like a TypeScript counterpart to enterprise-grade Hiero tooling.

## Install

```bash
npm install @hiero-dev/toolkit
```

Peer deps:
- `@tanstack/react-query`
- `react`
- `react-dom`

## Quickstart

### Mirror Client

```ts
import { MirrorClient } from "@hiero-dev/toolkit";

const client = new MirrorClient({
  baseUrl: "https://mainnet-public.mirrornode.hedera.com"
});

const account = await client.accounts()
  .byId("0.0.3")
  .includeBalance()
  .get();

for await (const tx of client.transactions()
  .forAccount("0.0.100")
  .limit(100)
  .order("desc")) {
  console.log(tx.transaction_id);
}
```

### Scheduled Transactions

```ts
import {
  MirrorClient,
  ScheduledTransactionManager
} from "@hiero-dev/toolkit";
import { Client, TransferTransaction } from "@hiero-ledger/sdk";

const hederaClient = Client.forTestnet();
const mirrorClient = new MirrorClient({ baseUrl: "https://testnet.mirrornode.hedera.com" });

const manager = new ScheduledTransactionManager({
  client: hederaClient,
  mirrorClient
});

const transfer = new TransferTransaction()
  .addHbarTransfer("0.0.1001", -1)
  .addHbarTransfer("0.0.1002", 1);

const created = await manager.create(transfer, "0.0.1001", "Payroll schedule", undefined, true);
console.log(created.scheduleId, created.execution?.transactionId);
```

### React / Next.js

```tsx
"use client";

import { HieroProvider, useHieroBalance } from "@hiero-dev/toolkit";

function BalanceCard() {
  const { data } = useHieroBalance("0.0.1001");
  return <p>Balance: {data ?? "-"}</p>;
}

export default function App() {
  return (
    <HieroProvider config={{ mirrorUrl: "https://testnet.mirrornode.hedera.com" }}>
      <BalanceCard />
    </HieroProvider>
  );
}
```

## Feature Overview

### 1) Typed Mirror Node API Access

- OpenAPI type generation (`openapi-generate.ts`)
- Fluent query builders (`accounts()`, `transactions()`)
- Async pagination via `for await...of`
- Retry + jitter + circuit breaker protections
- Optional in-memory LRU caching
- Zod runtime validation with typed errors

### 2) Scheduled Transaction Orchestration

- `create` with optional blocking `wait`
- `addSignature` for multi-party workflows
- `submitWhenReady` readiness trigger
- `waitForExecution` with smart exponential polling
- `getInfo` normalized metadata from SDK + Mirror Node

### 3) React / Next.js Integration

- `HieroProvider`
- `useHieroClient`
- Premium hooks:
  - `useAccount`
  - `useInfiniteTransactions`
  - `useTokenBalances`
  - `useHieroBalance`
  - `useScheduledStatus`
  - `useNftMetadata`

## Comparison

| Feature | Raw SDK | Toolkit |
| ------- | ------- | ------- |
| Mirror REST typing | Manual | OpenAPI-typed + validated |
| Query ergonomics | Low-level requests | Fluent builders + helpers |
| Pagination | Manual cursor handling | Async iterator + infinite query hooks |
| Reliability | Custom by app | Built-in retry, jitter, circuit breaker, cache |
| Scheduled tx orchestration | Verbose lifecycle wiring | High-level manager with status polling |
| React integration | DIY hooks + cache keys | First-class provider + hooks |

## Project Layout

```txt
src/
  config/
  mirror/
  scheduled/
  react/
examples/
  nextjs-demo/
tests/
openapi-generate.ts
```

## Example Project

The `examples/nextjs-demo` app demonstrates:
- Account balance display
- Infinite transaction list
- NFT metadata fetch flow

Run locally:

```bash
cd examples/nextjs-demo
npm install
npm run dev
```

## Scripts

```bash
npm run generate:openapi
npm run typecheck
npm run build
npm test
```

## Reliability Model

Mirror requests apply:
- Retry for `429`, `500`, `502`, `503`, `504`
- Exponential backoff with jitter
- Lightweight circuit breaker after repeated failures
- Optional response caching (default TTL: 5 minutes)
- Runtime payload validation with Zod

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md).

DCO sign-off is required for all commits:

```bash
git commit -s -m "feat: your change"
```

## License

Apache-2.0
