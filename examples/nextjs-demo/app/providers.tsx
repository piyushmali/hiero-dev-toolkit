"use client";

import type { ReactNode } from "react";

import { HieroProvider } from "@piyushmali/hiero-toolkit";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <HieroProvider
      config={{
        mirrorUrl: "https://testnet.mirrornode.hedera.com",
        network: "testnet"
      }}
    >
      {children}
    </HieroProvider>
  );
}
