"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
export type ScanStyle = "SWING" | "DAY";
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
export function useLastScan(style: ScanStyle = "SWING") {
  return useQuery({
    queryKey: ["admin", "scanner", "last", style],
    queryFn: () => apiClient<ScanResultRow>(`/scanner/last?style=${style}`),
  });
}
export function useTriggerScan(style: ScanStyle = "SWING") {
  const qc = useQueryClient();
  const path = style === "DAY" ? "/scanner/scan/day-trade" : "/scanner/scan";
  return useMutation({
    mutationFn: () => apiClient<{ message: string }>(path, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "scanner", "last", style] }),
  });
}
export function useLivePrice(symbol: string, enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "scanner", "price", symbol],
    queryFn: () => apiClient<{ symbol: string; price: number | null }>(`/scanner/price/${symbol}`),
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
export function useTrackedSignals(style: ScanStyle = "SWING") {
  return useQuery({
    queryKey: ["admin", "scanner", "tracked", style],
    queryFn: () => apiClient<TrackedSignalsData>(`/scanner/tracked?style=${style}`),
    refetchInterval: 30000,
  });
}
