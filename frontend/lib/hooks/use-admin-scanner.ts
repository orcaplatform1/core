"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
export type ScanStyle = "SWING" | "DAY";
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
  confidenceScore: number;
  confirmedCount: number;
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
export function useLastScan(style: ScanStyle = "SWING", market: ScanMarket = "CRYPTO") {
  return useQuery({
    queryKey: ["admin", "scanner", "last", style, market],
    queryFn: () => apiClient<ScanResultRow>(`/scanner/last?style=${style}&market=${market}`),
  });
}
export function useTriggerScan(style: ScanStyle = "SWING", market: ScanMarket = "CRYPTO") {
  const qc = useQueryClient();
  const path =
    market === "FOREX"
      ? style === "DAY" ? "/scanner/scan/forex/day-trade" : "/scanner/scan/forex"
      : style === "DAY" ? "/scanner/scan/day-trade" : "/scanner/scan";
  return useMutation({
    mutationFn: () => apiClient<{ message: string }>(path, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "scanner", "last", style, market] }),
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
export type TrackedSignalsData = {
  signals: TrackedSignal[];
  stats: {
    total: number;
    wins: number;
    losses: number;
    winRate: number | null;
  };
};
export function useTrackedSignals(style: ScanStyle = "SWING", market: ScanMarket = "CRYPTO") {
  return useQuery({
    queryKey: ["admin", "scanner", "tracked", style, market],
    queryFn: () => apiClient<TrackedSignalsData>(`/scanner/tracked?style=${style}&market=${market}`),
    refetchInterval: 30000,
  });
}
