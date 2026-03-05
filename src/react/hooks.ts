import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import type { ScheduleInfo } from "../scheduled";

import { useHieroClient } from "./context";
import { deriveScheduleState } from "./utils";
import { hieroQueryKeys } from "./query-keys";
import type { BaseHookOptions, InfiniteTransactionsOptions } from "./types";

/**
 * Fetches account metadata.
 *
 * @example
 * ```tsx
 * const { data } = useAccount("0.0.1001");
 * ```
 *
 * @param accountId Account ID.
 * @param options Query behavior overrides.
 */
export function useAccount(accountId: string, options: BaseHookOptions = {}) {
  const { mirrorClient } = useHieroClient();

  return useQuery({
    queryKey: hieroQueryKeys.account(accountId),
    queryFn: () => mirrorClient.getAccount(accountId),
    enabled: Boolean(accountId) && (options.enabled ?? true),
    staleTime: options.staleTime ?? 20_000,
    gcTime: options.gcTime,
    suspense: options.suspense
  });
}

/**
 * Fetches balance for an account.
 *
 * @param accountId Account ID.
 * @param options Query behavior overrides.
 */
export function useHieroBalance(accountId: string, options: BaseHookOptions = {}) {
  const { mirrorClient } = useHieroClient();

  return useQuery({
    queryKey: hieroQueryKeys.balance(accountId),
    queryFn: () => mirrorClient.getBalance(accountId),
    enabled: Boolean(accountId) && (options.enabled ?? true),
    staleTime: options.staleTime ?? 10_000,
    gcTime: options.gcTime,
    suspense: options.suspense
  });
}

/**
 * Fetches fungible token balances for an account.
 *
 * @param accountId Account ID.
 * @param options Query behavior overrides.
 */
export function useTokenBalances(accountId: string, options: BaseHookOptions = {}) {
  const { mirrorClient } = useHieroClient();

  return useQuery({
    queryKey: hieroQueryKeys.tokenBalances(accountId),
    queryFn: () => mirrorClient.getTokenBalances(accountId),
    enabled: Boolean(accountId) && (options.enabled ?? true),
    staleTime: options.staleTime ?? 20_000,
    gcTime: options.gcTime,
    suspense: options.suspense
  });
}

/**
 * Streams paginated transactions with infinite-query ergonomics.
 *
 * @example
 * ```tsx
 * const query = useInfiniteTransactions("0.0.1001", { pageSize: 50 });
 * ```
 *
 * @param accountId Account ID.
 * @param options Infinite query options.
 */
export function useInfiniteTransactions(
  accountId: string,
  options: InfiniteTransactionsOptions = {}
) {
  const { mirrorClient } = useHieroClient();
  const pageSize = options.pageSize ?? 25;
  const order = options.order ?? "desc";

  return useInfiniteQuery({
    queryKey: hieroQueryKeys.transactions(accountId, pageSize, order),
    queryFn: ({ pageParam }) =>
      mirrorClient
        .transactions()
        .forAccount(accountId)
        .limit(pageSize)
        .order(order)
        .getPage((pageParam as string | undefined) ?? undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.links.next ?? undefined,
    enabled: Boolean(accountId) && (options.enabled ?? true),
    staleTime: options.staleTime ?? 5_000,
    gcTime: options.gcTime,
    suspense: options.suspense
  });
}

/**
 * Polls scheduled transaction status using manager when available.
 *
 * @param scheduleId Schedule ID.
 * @param options Query behavior overrides.
 */
export function useScheduledStatus(scheduleId: string, options: BaseHookOptions = {}) {
  const { mirrorClient, scheduledManager } = useHieroClient();

  return useQuery({
    queryKey: hieroQueryKeys.schedule(scheduleId),
    queryFn: async (): Promise<ScheduleInfo> => {
      if (scheduledManager) {
        return scheduledManager.getInfo(scheduleId);
      }

      const schedule = await mirrorClient.getSchedule(scheduleId);
      const status = deriveScheduleState(schedule);

      return {
        scheduleId,
        status,
        transactionId: schedule.transaction_id,
        executedAt: schedule.executed_timestamp ?? undefined,
        expirationTime: schedule.expiration_time,
        mirror: schedule
      };
    },
    enabled: Boolean(scheduleId) && (options.enabled ?? true),
    staleTime: options.staleTime ?? 5_000,
    gcTime: options.gcTime,
    suspense: options.suspense,
    refetchInterval: 5_000
  });
}

/**
 * Fetches NFT metadata for a token serial.
 *
 * @param tokenId Token ID.
 * @param serial Serial number.
 * @param options Query behavior overrides.
 */
export function useNftMetadata(
  tokenId: string,
  serial: number,
  options: BaseHookOptions = {}
) {
  const { mirrorClient } = useHieroClient();

  return useQuery({
    queryKey: hieroQueryKeys.nft(tokenId, serial),
    queryFn: () => mirrorClient.getNftInfo(tokenId, serial),
    enabled: Boolean(tokenId) && Number.isFinite(serial) && (options.enabled ?? true),
    staleTime: options.staleTime ?? 60_000,
    gcTime: options.gcTime,
    suspense: options.suspense
  });
}
