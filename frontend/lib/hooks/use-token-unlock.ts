"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type TokenUnlockEvent = {
  id: string;
  externalId: string;
  tokenSymbol: string;
  unlockDate: string;
  amountUsd: number | null;
  percentOfSupply: number | null;
  createdAt: string;
  updatedAt: string;
};

export function useTokenUnlocks() {
  return useQuery({
    queryKey: ["tools", "crypto", "unlocks"],
    queryFn: () => apiClient<TokenUnlockEvent[]>("/tools/crypto/unlocks"),
    refetchInterval: 1000 * 60 * 60,
  });
}
