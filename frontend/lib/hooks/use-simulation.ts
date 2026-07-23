"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { SimulationAccount, SimulatedTrade } from "@/lib/types/curriculum";

export function useSimulationAccount() {
  return useQuery({
    queryKey: ["simulation", "account"],
    queryFn: () => apiClient<SimulationAccount>("/simulation/account"),
  });
}

export function useSimulationTrades() {
  return useQuery({
    queryKey: ["simulation", "trades"],
    queryFn: () => apiClient<SimulatedTrade[]>("/simulation/trades"),
  });
}

export function useOpenTrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { symbol: string; direction: "BUY" | "SELL"; quantity: number; leverage: number }) =>
      apiClient<SimulatedTrade>("/simulation/trades", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulation", "account"] });
      queryClient.invalidateQueries({ queryKey: ["simulation", "trades"] });
    },
  });
}

export function useCloseTrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tradeId: string) =>
      apiClient<SimulatedTrade>(`/simulation/trades/${tradeId}/close`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulation", "account"] });
      queryClient.invalidateQueries({ queryKey: ["simulation", "trades"] });
    },
  });
}
