/**
 * Centralized query-key factory for stable cache behavior.
 */
export const hieroQueryKeys = {
  root: () => ["hiero"] as const,
  account: (accountId: string) => ["hiero", "account", accountId] as const,
  balance: (accountId: string) => ["hiero", "balance", accountId] as const,
  tokenBalances: (accountId: string) => ["hiero", "token-balances", accountId] as const,
  transactions: (accountId: string, pageSize: number, order: "asc" | "desc") =>
    ["hiero", "transactions", accountId, pageSize, order] as const,
  schedule: (scheduleId: string) => ["hiero", "schedule", scheduleId] as const,
  nft: (tokenId: string, serial: number) => ["hiero", "nft", tokenId, serial] as const
};
