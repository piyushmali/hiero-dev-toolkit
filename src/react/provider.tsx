"use client";

import { useMemo, useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { MirrorClient } from "../mirror";
import { ScheduledTransactionManager } from "../scheduled";

import { HieroContext } from "./context";
import type { HieroProviderProps } from "./types";

/**
 * Configures and provides Hiero toolkit clients to a React subtree.
 *
 * @example
 * ```tsx
 * <HieroProvider config={{ mirrorUrl: "https://mainnet-public.mirrornode.hedera.com" }}>
 *   <App />
 * </HieroProvider>
 * ```
 *
 * @param props Provider props.
 * @returns React provider element.
 */
export function HieroProvider({
  config,
  children,
  queryClient,
  withQueryClientProvider = true
}: HieroProviderProps): JSX.Element {
  const [mirrorClient] = useState(
    () =>
      config.mirrorClient ??
      new MirrorClient({
        ...config.mirrorOptions,
        baseUrl: config.mirrorUrl ?? config.mirrorOptions?.baseUrl
      })
  );

  const [scheduledManager] = useState(
    () =>
      config.scheduledManager ??
      (config.client
        ? new ScheduledTransactionManager({
            client: config.client,
            mirrorClient
          })
        : undefined)
  );

  const [managedQueryClient] = useState(() => queryClient ?? new QueryClient());

  const value = useMemo(
    () => ({
      mirrorClient,
      scheduledManager,
      network: config.network ?? "mainnet"
    }),
    [config.network, mirrorClient, scheduledManager]
  );

  const content = <HieroContext.Provider value={value}>{children}</HieroContext.Provider>;

  if (!withQueryClientProvider) {
    return content;
  }

  return <QueryClientProvider client={managedQueryClient}>{content}</QueryClientProvider>;
}
