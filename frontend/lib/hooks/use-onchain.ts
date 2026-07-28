"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type OnchainData = {
  blockHeight: number | null;
  mempool: { count: number; vsizeMb: number } | null;
  fees: {
    fastestFee: number;
    halfHourFee: number;
    hourFee: number;
    economyFee: number;
    minimumFee: number;
  } | null;
  hashrate: { currentEh: number; difficulty: number } | null;
  activeAddresses24h: number | null;
  txVolume24h: number | null;
  updatedAt: string;
};

export function useOnchain() {
  return useQuery({
    queryKey: ["tools", "crypto", "onchain"],
    queryFn: () => apiClient<OnchainData | null>("/tools/crypto/onchain"),
    refetchInterval: 1000 * 60 * 10,
  });
}
