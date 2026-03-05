import type { ZodType } from "zod";

import { MirrorHttpClient } from "./http";
import { AccountsQueryBuilder, TransactionsQueryBuilder } from "./query-builders";
import {
  accountListSchema,
  accountSchemaStrict,
  balanceSnapshotSchema,
  nftInfoSchema,
  scheduleSchema,
  tokenBalancesSchema,
  topicMessagesSchema,
  transactionsSchema
} from "./validators";
import type {
  MirrorAccount,
  MirrorAccountListResponse,
  MirrorClientOptions,
  MirrorNftInfo,
  MirrorSchedule,
  MirrorTokenBalance,
  MirrorTokenBalanceResponse,
  MirrorTopicMessagesResponse,
  MirrorTransactionsResponse
} from "./types";

/**
 * Typed, resilient client for Hiero Mirror Node APIs.
 *
 * @example
 * ```ts
 * const client = new MirrorClient();
 *
 * const account = await client.accounts()
 *   .byId("0.0.3")
 *   .includeBalance()
 *   .get();
 *
 * const txPage = await client.transactions()
 *   .forAccount("0.0.100")
 *   .limit(100)
 *   .order("desc")
 *   .get();
 * ```
 */
export class MirrorClient {
  private readonly http: MirrorHttpClient;

  /**
   * Creates a Mirror Node client with production-safe defaults.
   *
   * @param options Transport and reliability options.
   */
  constructor(options: MirrorClientOptions = {}) {
    this.http = new MirrorHttpClient(options);
  }

  /**
   * Starts a fluent account query builder.
   */
  accounts(): AccountsQueryBuilder {
    return new AccountsQueryBuilder(this);
  }

  /**
   * Starts a fluent transaction query builder.
   */
  transactions(): TransactionsQueryBuilder {
    return new TransactionsQueryBuilder(this);
  }

  /**
   * Fetches a single account.
   *
   * @param accountId Account ID.
   * @returns Account metadata.
   */
  async getAccount(accountId: string): Promise<MirrorAccount> {
    return this.fetchAccount(accountId);
  }

  /**
   * Fetches latest HBAR balance for an account.
   *
   * @param accountId Account ID.
   * @returns Numeric balance in tinybars when available.
   */
  async getBalance(accountId: string): Promise<number | undefined> {
    const snapshot = await this.fetchBalanceSnapshot(accountId);
    return snapshot.balances[0]?.balance;
  }

  /**
   * Fetches fungible token balances for an account.
   *
   * @param accountId Account ID.
   * @returns Token balances list.
   */
  async getTokenBalances(accountId: string): Promise<MirrorTokenBalance[]> {
    const response = await this.fetchTokenBalances(accountId);
    return response.tokens;
  }

  /**
   * Fetches NFT metadata and owner information.
   *
   * @param tokenId Token ID.
   * @param serial NFT serial number.
   * @returns NFT metadata payload.
   */
  async getNftInfo(tokenId: string, serial: number): Promise<MirrorNftInfo> {
    return this.request(`/api/v1/tokens/${encodeURIComponent(tokenId)}/nfts/${serial}`, nftInfoSchema);
  }

  /**
   * Fetches a schedule from Mirror Node.
   *
   * @param scheduleId Schedule ID.
   * @returns Schedule details.
   */
  async getSchedule(scheduleId: string): Promise<MirrorSchedule> {
    return this.request(`/api/v1/schedules/${encodeURIComponent(scheduleId)}`, scheduleSchema);
  }

  /**
   * Searches accounts by query string.
   *
   * @param query Account query value.
   * @returns Matching account list.
   */
  async searchAccounts(query: string): Promise<MirrorAccount[]> {
    const response = await this.accounts().search(query).limit(25).getList();
    return response.accounts;
  }

  /**
   * Fetches messages for a consensus topic.
   *
   * @param topicId Topic ID.
   * @param limit Optional max messages per page.
   * @returns Topic messages response.
   */
  async getTopicMessages(topicId: string, limit = 25): Promise<MirrorTopicMessagesResponse> {
    return this.request(`/api/v1/topics/${encodeURIComponent(topicId)}/messages`, topicMessagesSchema, {
      limit,
      order: "desc"
    });
  }

  /**
   * Convenience method for most recent transactions for an account.
   *
   * @param accountId Account ID.
   * @param limit Number of transactions.
   * @returns Transactions list.
   */
  async getRecentTransactions(accountId: string, limit = 25): Promise<MirrorTransactionsResponse["transactions"]> {
    const response = await this.transactions().forAccount(accountId).limit(limit).order("desc").get();
    return response.transactions;
  }

  /**
   * Internal: validated GET wrapper used by query builders.
   */
  async request<T>(
    pathOrUrl: string,
    schema: ZodType<T>,
    queryParams?: Record<string, string | number | boolean>
  ): Promise<T> {
    return this.http.get(pathOrUrl, schema, queryParams);
  }

  /**
   * Internal helper for account builders.
   */
  async fetchAccount(accountId: string): Promise<MirrorAccount> {
    return this.request(`/api/v1/accounts/${encodeURIComponent(accountId)}`, accountSchemaStrict);
  }

  /**
   * Internal helper for account list builder.
   */
  async fetchAccountsList(
    queryParams?: Record<string, string | number | boolean>
  ): Promise<MirrorAccountListResponse> {
    return this.request("/api/v1/accounts", accountListSchema, queryParams);
  }

  /**
   * Internal helper for transaction builders.
   */
  async fetchTransactions(
    pathOrUrl = "/api/v1/transactions",
    queryParams?: Record<string, string | number | boolean>
  ): Promise<MirrorTransactionsResponse> {
    return this.request(pathOrUrl, transactionsSchema, queryParams);
  }

  /**
   * Internal helper for balance lookups.
   */
  async fetchBalanceSnapshot(accountId: string): Promise<{
    balances: Array<{ account: string; balance: number; tokens?: MirrorTokenBalance[] }>;
    timestamp?: string;
    links: { next: string | null };
  }> {
    return this.request("/api/v1/balances", balanceSnapshotSchema, {
      "account.id": accountId,
      order: "desc",
      limit: 1
    });
  }

  /**
   * Internal helper for token balance lookups.
   */
  async fetchTokenBalances(accountId: string): Promise<MirrorTokenBalanceResponse> {
    return this.request(`/api/v1/accounts/${encodeURIComponent(accountId)}/tokens`, tokenBalancesSchema);
  }
}
