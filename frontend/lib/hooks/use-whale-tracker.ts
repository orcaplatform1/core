"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type WhaleCategory = "EXCHANGE" | "INSTITUTION" | "WHALE";
export type MovementDirection = "IN" | "OUT";

export type WhaleAddressActivity = {
  id: string;
  address: string;
  label: string;
  category: WhaleCategory;
  network: string;
  latestBalanceSat: number | null;
  latestBalanceCapturedAt: string | null;
};

export type WhaleMovementActivity = {
  id: string;
  addressId: string;
  addressLabel: string;
  txid: string;
  amountSat: number;
  direction: MovementDirection;
  balanceAfterSat: number;
  detectedAt: string;
};

export type WhaleActivityResponse = {
  addresses: WhaleAddressActivity[];
  movements: WhaleMovementActivity[];
};

export function useWhaleActivity() {
  return useQuery({
    queryKey: ["tools", "crypto", "whales"],
    queryFn: () => apiClient<WhaleActivityResponse>("/tools/crypto/whales"),
    refetchInterval: 5 * 60_000,
  });
}
