import type {
  MirrorAccount,
  MirrorAccountListResponse,
  MirrorOrder,
  MirrorTransaction,
  MirrorTransactionsResponse
} from "./types";

import type { MirrorClient } from "./client";

/**
 * Fluent builder for account queries.
 */
export class AccountsQueryBuilder {
  private readonly query: URLSearchParams;

  constructor(
    private readonly client: MirrorClient,
    private readonly accountId?: string,
    private readonly includeBalanceFlag = false,
    query?: URLSearchParams
  ) {
    this.query = query ? new URLSearchParams(query) : new URLSearchParams();
  }

  /**
   * Targets a specific account.
   *
   * @example
   * ```ts
   * const account = await client.accounts().byId("0.0.3").get();
   * ```
   *
   * @param accountId Hiero account ID (e.g. `0.0.3`).
   */
  byId(accountId: string): AccountsQueryBuilder {
    return new AccountsQueryBuilder(this.client, accountId, this.includeBalanceFlag, this.query);
  }

  /**
   * Requests balance enrichment when querying a single account.
   *
   * @example
   * ```ts
   * const account = await client.accounts().byId("0.0.3").includeBalance().get();
   * ```
   */
  includeBalance(): AccountsQueryBuilder {
    return new AccountsQueryBuilder(this.client, this.accountId, true, this.query);
  }

  /**
   * Adds an account search query. Internally mapped to `account.id`.
   *
   * @param query Account query value.
   */
  search(query: string): AccountsQueryBuilder {
    const next = new URLSearchParams(this.query);
    next.set("account.id", query);
    return new AccountsQueryBuilder(this.client, this.accountId, this.includeBalanceFlag, next);
  }

  /**
   * Limits response size for list queries.
   *
   * @param value Maximum number of records.
   */
  limit(value: number): AccountsQueryBuilder {
    const next = new URLSearchParams(this.query);
    next.set("limit", String(value));
    return new AccountsQueryBuilder(this.client, this.accountId, this.includeBalanceFlag, next);
  }

  /**
   * Sets sort order for list queries.
   *
   * @param value Sort order.
   */
  order(value: MirrorOrder): AccountsQueryBuilder {
    const next = new URLSearchParams(this.query);
    next.set("order", value);
    return new AccountsQueryBuilder(this.client, this.accountId, this.includeBalanceFlag, next);
  }

  /**
   * Executes the query.
   *
   * @returns `MirrorAccount` for `byId` queries, otherwise paginated account list.
   */
  async get(): Promise<MirrorAccount | MirrorAccountListResponse> {
    if (this.accountId) {
      const account = await this.client.fetchAccount(this.accountId);

      if (!this.includeBalanceFlag) {
        return account;
      }

      const balance = await this.client.fetchBalanceSnapshot(this.accountId);
      const current = balance.balances[0];

      return {
        ...account,
        balance: {
          balance: current?.balance ?? 0,
          timestamp: balance.timestamp ?? new Date().toISOString(),
          tokens: current?.tokens
        }
      };
    }

    return this.client.fetchAccountsList(Object.fromEntries(this.query.entries()));
  }

  /**
   * Executes and always returns list shape.
   */
  async getList(): Promise<MirrorAccountListResponse> {
    const response = await this.get();
    if ("accounts" in response) {
      return response;
    }

    return {
      accounts: [response],
      links: { next: null }
    };
  }
}

/**
 * Fluent builder for transaction queries with async pagination support.
 */
export class TransactionsQueryBuilder implements AsyncIterable<MirrorTransaction> {
  private readonly query: URLSearchParams;

  constructor(private readonly client: MirrorClient, query?: URLSearchParams) {
    this.query = query ? new URLSearchParams(query) : new URLSearchParams();

    if (!this.query.has("limit")) {
      this.query.set("limit", "100");
    }

    if (!this.query.has("order")) {
      this.query.set("order", "desc");
    }
  }

  /**
   * Filters transactions for an account.
   *
   * @param accountId Hiero account ID.
   */
  forAccount(accountId: string): TransactionsQueryBuilder {
    const next = new URLSearchParams(this.query);
    next.set("account.id", accountId);
    return new TransactionsQueryBuilder(this.client, next);
  }

  /**
   * Limits transactions per page.
   *
   * @param value Number of records requested.
   */
  limit(value: number): TransactionsQueryBuilder {
    const next = new URLSearchParams(this.query);
    next.set("limit", String(value));
    return new TransactionsQueryBuilder(this.client, next);
  }

  /**
   * Controls sort direction.
   *
   * @param value Sort order.
   */
  order(value: MirrorOrder): TransactionsQueryBuilder {
    const next = new URLSearchParams(this.query);
    next.set("order", value);
    return new TransactionsQueryBuilder(this.client, next);
  }

  /**
   * Filters by transaction result.
   *
   * @param value Result enum from Mirror Node (e.g. `SUCCESS`).
   */
  result(value: string): TransactionsQueryBuilder {
    const next = new URLSearchParams(this.query);
    next.set("result", value);
    return new TransactionsQueryBuilder(this.client, next);
  }

  /**
   * Filters by transaction type.
   *
   * @param value Transaction type value.
   */
  type(value: string): TransactionsQueryBuilder {
    const next = new URLSearchParams(this.query);
    next.set("transactiontype", value);
    return new TransactionsQueryBuilder(this.client, next);
  }

  /**
   * Fetches the first page of query results.
   */
  async get(): Promise<MirrorTransactionsResponse> {
    return this.getPage();
  }

  /**
   * Fetches a specific page by next-link URL, or first page when omitted.
   *
   * @param nextLink Next link from a previous response.
   */
  async getPage(nextLink?: string): Promise<MirrorTransactionsResponse> {
    if (nextLink) {
      return this.client.fetchTransactions(nextLink);
    }

    return this.client.fetchTransactions("/api/v1/transactions", Object.fromEntries(this.query.entries()));
  }

  /**
   * Async iterator over all matching transactions across pages.
   *
   * @example
   * ```ts
   * for await (const tx of client.transactions().forAccount("0.0.100").limit(100)) {
   *   console.log(tx.transaction_id);
   * }
   * ```
   */
  async *[Symbol.asyncIterator](): AsyncIterator<MirrorTransaction> {
    let next: string | undefined;

    do {
      const page = await this.getPage(next);
      for (const transaction of page.transactions) {
        yield transaction;
      }
      next = page.links.next ?? undefined;
    } while (next);
  }
}
