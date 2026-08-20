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
  tp1: { count: number; r: number; d: number };
  tp2: { count: number; r: number; d: number };
  tp3: { count: number; r: number; d: number };
  stopped: { count: number; r: number; d: number };
  rWon: number;
  rLost: number;
  rNet: number;
  dWon: number;
  dLost: number;
  dNet: number;
  fees: number;
  funding: number;
  simBalance: number;
  simLeverage: number;
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

export type AutoTradeConfig = {
  id: string;
  enabled: boolean;
  testnet: boolean;
  cryptoEnabled: boolean;
  forexEnabled: boolean;
  riskPerTradeUsdt: number;
  leverage: number;
  updatedAt: string;
  apiKeyConfigured: boolean;
  testnetActive: boolean;
};
export type AutoTrade = {
  id: string;
  trackedSignalId: string;
  symbol: string;
  direction: string;
  status: "PENDING_ENTRY" | "OPEN" | "BREAKEVEN_SET" | "CLOSED" | "EXPIRED" | "FAILED";
  entryPrice: number | null;
  qty: number | null;
  closeReason: "TP3" | "STOP_BREAKEVEN" | "STOP_FULL_LOSS" | "MANUAL_CLOSE" | null;
  realizedPnl: number | null;
  commission: number | null;
  funding: number | null;
  netPnl: number | null;
  errorMessage: string | null;
  createdAt: string;
};
export type AutoTradeStats = {
  totalClosed: number;
  wins: number;
  losses: number;
  winRate: number | null;
  totalRealizedPnl: number;
  totalCommission: number;
  totalFunding: number;
  totalNetPnl: number;
};
export function useAutoTradeStats() {
  return useQuery({
    queryKey: ["admin", "scanner", "auto-trade", "stats"],
    queryFn: () => apiClient<AutoTradeStats>(`/scanner/auto-trade/stats`),
    refetchInterval: 30000,
  });
}
export function useAutoTradeConfig() {
  return useQuery({
    queryKey: ["admin", "scanner", "auto-trade", "config"],
    queryFn: () => apiClient<AutoTradeConfig>(`/scanner/auto-trade/config`),
    refetchInterval: 30000,
  });
}
export function useUpdateAutoTradeConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Pick<AutoTradeConfig, "enabled" | "cryptoEnabled" | "riskPerTradeUsdt" | "leverage">>) =>
      apiClient<AutoTradeConfig>(`/scanner/auto-trade/config`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "scanner", "auto-trade", "config"] }),
  });
}
export type LiveAutoTradePosition = {
  id: string;
  symbol: string;
  direction: string;
  status: "PENDING_ENTRY" | "OPEN" | "BREAKEVEN_SET";
  entryPrice: number | null;
  qty: number | null;
  markPrice: number | null;
  unrealizedProfit: number | null;
  notional: number | null;
  leverage: number | null;
  liquidationPrice: number | null;
  fundingRate: number | null;
  stopPrice: number | null;
  stopTriggered: boolean;
  tp1Price: number | null;
  tp2Price: number | null;
  tp3Price: number | null;
  realizedSoFar: number;
  commissionSoFar: number;
  fundingSoFar: number;
};
export function useAutoTradePositions() {
  return useQuery({
    queryKey: ["admin", "scanner", "auto-trade", "positions"],
    queryFn: () => apiClient<LiveAutoTradePosition[]>(`/scanner/auto-trade/positions`),
    refetchInterval: 5000,
  });
}
export function useCloseAutoTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient<{ closed: boolean }>(`/scanner/auto-trade/${id}/close`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "scanner", "auto-trade"] });
    },
  });
}
export function useCloseAllAutoTrades() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient<{ closed: number }>(`/scanner/auto-trade/close-all`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "scanner", "auto-trade"] });
    },
  });
}
export function useAutoTrades() {
  return useQuery({
    queryKey: ["admin", "scanner", "auto-trade", "trades"],
    queryFn: () => apiClient<AutoTrade[]>(`/scanner/auto-trade/trades`),
    refetchInterval: 15000,
  });
}
export type BtcCandle = { time: number; open: number; high: number; low: number; close: number };
export type MarketContext = {
  btcCandles: BtcCandle[];
  btcPrice: number | null;
  btcChangePercent: number | null;
  correlations: Record<string, number | null>;
};
export function useMarketContext(symbols: string[]) {
  const key = Array.from(new Set(symbols)).sort().join(",");
  return useQuery({
    queryKey: ["admin", "scanner", "auto-trade", "market-context", key],
    queryFn: () => apiClient<MarketContext>(`/scanner/auto-trade/market-context?symbols=${encodeURIComponent(key)}`),
    refetchInterval: 5000,
  });
}
