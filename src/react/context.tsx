import { createContext, useContext } from "react";

import type { HieroContextValue } from "./types";

export const HieroContext = createContext<HieroContextValue | undefined>(undefined);

/**
 * Returns configured toolkit clients from context.
 *
 * @example
 * ```tsx
 * const { mirrorClient, scheduledManager } = useHieroClient();
 * ```
 *
 * @returns Mirror client and optional scheduled manager.
 */
export function useHieroClient(): HieroContextValue {
  const context = useContext(HieroContext);
  if (!context) {
    throw new Error("useHieroClient must be used within a HieroProvider");
  }

  return context;
}
