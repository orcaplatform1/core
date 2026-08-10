"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
export type ScanMarket = "CRYPTO" | "FOREX";
export type ScanSignal = {
  symbol: string;
  direction: "LONG" | "SHORT";
  currentPrice: number;
  entry: number;
  entryZoneTop: number;
  entryZoneBottom: number;
  stop: number;
  tp1: number;
  tp2: number;
  tp3: number;
  rr: number;
  reasons: string[];
  strength: "GUCLU" | "ORTA" | "RISKLI";
  stillValid: boolean;
  distancePercent: number;
  fundingRate: number | null;
  aiCommentary: string | null;
};
export type ScanResultData = {
  crypto: ScanSignal[];
  scannedAt: string;
};
export type ScanResultRow = {
  id: string;
  results: ScanResultData;
  createdAt: string;
};
export function useLastScan(market: ScanMarket = "CRYPTO") {
  return useQuery({
    queryKey: ["admin", "scanner", "last", market],
    queryFn: () => apiClient<ScanResultRow>(`/scanner/last?market=${market}`),
  });
}
export function useTriggerScan(market: ScanMarket = "CRYPTO") {
  const qc = useQueryClient();
  const path = market === "FOREX" ? "/scanner/scan/forex/day-trade" : "/scanner/scan/day-trade";
  return useMutation({
    mutationFn: () => apiClient<{ message: string }>(path, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "scanner", "last", market] }),
  });
}
export function useLivePrice(symbol: string, enabled: boolean, market: ScanMarket = "CRYPTO") {
  return useQuery({
    queryKey: ["admin", "scanner", "price", symbol, market],
    queryFn: () => apiClient<{ symbol: string; price: number | null }>(`/scanner/price/${symbol}?market=${market}`),
    enabled,
    refetchInterval: 3000,
  });
}
export type TrackedSignal = {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  entry: number | null;
  entryZoneTop: number;
  entryZoneBottom: number;
  stop: number;
  tp1: number;
  tp2: number;
  tp3: number;
  rr: number;
  strength: "GUCLU" | "ORTA" | "RISKLI";
  status: "WATCHING" | "TRIGGERED" | "HIT_TP1" | "HIT_TP2" | "HIT_TP3" | "HIT_STOP" | "EXPIRED";
  createdAt: string;
  triggeredAt: string | null;
  closedAt: string | null;
};
export type SignalStatsBlock = {
  total: number;
  wins: number;
  losses: number;
  winRate: number | null;
  tp1: { count: number; r: number };
  tp2: { count: number; r: number };
  tp3: { count: number; r: number };
  stopped: { count: number; r: number };
  rWon: number;
  rLost: number;
  rNet: number;
};
export type TrackedSignalsData = {
  signals: TrackedSignal[];
  stats: SignalStatsBlock;
};
export function useTrackedSignals(market: ScanMarket = "CRYPTO") {
  return useQuery({
    queryKey: ["admin", "scanner", "tracked", market],
    queryFn: () => apiClient<TrackedSignalsData>(`/scanner/tracked?market=${market}`),
    refetchInterval: 30000,
  });
}
