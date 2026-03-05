import type { ReactNode } from "react";

import type { QueryClient } from "@tanstack/react-query";
import type { Client } from "@hiero-ledger/sdk";

import type { MirrorClient, MirrorClientOptions } from "../mirror";
import type { ScheduledTransactionManager } from "../scheduled";

/**
 * Provider runtime configuration.
 */
export interface HieroProviderConfig {
  mirrorUrl?: string;
  mirrorOptions?: MirrorClientOptions;
  mirrorClient?: MirrorClient;
  client?: Client;
  scheduledManager?: ScheduledTransactionManager;
  network?: "mainnet" | "testnet" | "previewnet" | string;
}

/**
 * React provider props.
 */
export interface HieroProviderProps {
  config: HieroProviderConfig;
  children: ReactNode;
  queryClient?: QueryClient;
  withQueryClientProvider?: boolean;
}

/**
 * Shared context value consumed by hooks.
 */
export interface HieroContextValue {
  mirrorClient: MirrorClient;
  scheduledManager?: ScheduledTransactionManager;
  network: string;
}

export interface BaseHookOptions {
  enabled?: boolean;
  suspense?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export interface InfiniteTransactionsOptions extends BaseHookOptions {
  pageSize?: number;
  order?: "asc" | "desc";
}
