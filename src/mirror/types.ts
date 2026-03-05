import type { paths } from "./generated/openapi";

export type MirrorOrder = "asc" | "desc";

export interface MirrorRetryOptions {
  attempts: number;
  backoffMs: number;
  maxBackoffMs: number;
  jitterRatio: number;
}

export interface MirrorCircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
}

export interface MirrorCacheOptions {
  ttlMs: number;
  max: number;
}

export interface MirrorClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  retry?: Partial<MirrorRetryOptions>;
  cache?: boolean | Partial<MirrorCacheOptions>;
  circuitBreaker?: Partial<MirrorCircuitBreakerOptions>;
  fetcher?: typeof fetch;
}

export interface MirrorPaginationLinks {
  next: string | null;
}

export interface MirrorAccount {
  account: string;
  alias?: string | null;
  auto_renew_period?: number | null;
  balance?: {
    balance: number;
    timestamp: string;
    tokens?: MirrorTokenBalance[];
  };
  created_timestamp?: string;
  decline_reward?: boolean;
  deleted?: boolean;
  ethereum_nonce?: number | null;
  evm_address?: string | null;
  key?: {
    key: string;
  } | null;
  memo?: string | null;
}

export interface MirrorAccountListResponse {
  accounts: MirrorAccount[];
  links: MirrorPaginationLinks;
}

export interface MirrorTokenBalance {
  token_id: string;
  balance: number;
  decimals?: number;
  kyc_status?: string;
}

export interface MirrorTokenBalanceResponse {
  tokens: MirrorTokenBalance[];
  links: MirrorPaginationLinks;
}

export interface MirrorTransfer {
  account: string;
  amount: number;
  is_approval?: boolean;
}

export interface MirrorTransaction {
  transaction_id: string;
  consensus_timestamp?: string;
  name?: string;
  result?: string;
  charged_tx_fee?: number;
  entity_id?: string | null;
  memo_base64?: string;
  transfers?: MirrorTransfer[];
}

export interface MirrorTransactionsResponse {
  transactions: MirrorTransaction[];
  links: MirrorPaginationLinks;
}

export interface MirrorNftInfo {
  account_id?: string;
  metadata?: string;
  serial_number?: number;
  token_id?: string;
  spender?: string | null;
  deleted?: boolean;
  modified_timestamp?: string;
}

export interface MirrorSchedule {
  schedule_id: string;
  creator_account_id?: string;
  payer_account_id?: string;
  admin_key?: {
    key: string;
  } | null;
  memo?: string;
  deleted?: boolean;
  expiration_time?: string;
  executed_timestamp?: string | null;
  transaction_id?: string;
  signers?: Array<{
    key: string;
  }>;
}

export interface MirrorTopicMessage {
  consensus_timestamp: string;
  message: string;
  running_hash: string;
  sequence_number: number;
  topic_id: string;
}

export interface MirrorTopicMessagesResponse {
  messages: MirrorTopicMessage[];
  links: MirrorPaginationLinks;
}

export type OpenApiPaths = paths;
