"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  CryptoMovers,
  CryptoHeatmap,
  FundingRow,
  FearGreedData,
  LiquidationZonesResponse,
  ForexQuote,
  EconomicIndicatorsResponse,
  BistIndexData,
  BistStocksResponse,
  GoldAndTlData,
  CotRow,
  CorrelationMatrix,
  TrendingCoin,
  StablecoinFlowData,
  AltcoinSeasonData,
  EtfFlowsResponse,
  OrderFlowData,
  HeatmapResponse,
  CbbiData,
  CycleSnapshot,
  CycleMacro,
  ExchangeFlows,
  Ahr999Data,
  TwoYearMaMultiplierData,
  RsiHeatmapRow,
  LongShortRow,
  MarketPulse,
  DcaResult,
} from "@/lib/types/tools";

export function useCryptoMovers() {
  return useQuery({
    queryKey: ["tools", "crypto", "movers"],
    queryFn: () => apiClient<CryptoMovers>("/tools/crypto/movers"),
    refetchInterval: 60_000,
  });
}

export function useCryptoHeatmap() {
  return useQuery({
    queryKey: ["tools", "crypto", "heatmap"],
    queryFn: () => apiClient<CryptoHeatmap>("/tools/crypto/heatmap"),
    refetchInterval: 5 * 60_000,
  });
}

export function useFundingRates() {
  return useQuery({
    queryKey: ["tools", "crypto", "funding-rates"],
    queryFn: () => apiClient<FundingRow[]>("/tools/crypto/funding-rates"),
    refetchInterval: 5 * 60_000,
  });
}

export function useFearGreed() {
  return useQuery({
    queryKey: ["tools", "crypto", "fear-greed"],
    queryFn: () => apiClient<FearGreedData | null>("/tools/crypto/fear-greed"),
    refetchInterval: 60 * 60_000,
  });
}

export function useLiquidationZones() {
  return useQuery({
    queryKey: ["tools", "crypto", "liquidation-zones"],
    queryFn: () => apiClient<LiquidationZonesResponse>("/tools/crypto/liquidation-zones"),
    refetchInterval: 10 * 60_000,
  });
}

export function useForexQuotes() {
  return useQuery({
    queryKey: ["tools", "forex", "quotes"],
    queryFn: () => apiClient<ForexQuote[]>("/tools/forex/quotes"),
    refetchInterval: 15 * 60_000,
  });
}

export function useEconomicIndicators() {
  return useQuery({
    queryKey: ["tools", "economic", "indicators"],
    queryFn: () => apiClient<EconomicIndicatorsResponse>("/tools/economic/indicators"),
    refetchInterval: 60 * 60_000,
  });
}

export function useBistIndex() {
  return useQuery({
    queryKey: ["tools", "bist", "index"],
    queryFn: () => apiClient<BistIndexData | null>("/tools/bist/index"),
    refetchInterval: 5 * 60_000,
  });
}

export function useBistStocks() {
  return useQuery({
    queryKey: ["tools", "bist", "stocks"],
    queryFn: () => apiClient<BistStocksResponse>("/tools/bist/stocks"),
    refetchInterval: 5 * 60_000,
  });
}

export function useGoldAndTl() {
  return useQuery({
    queryKey: ["tools", "forex", "gold-tl"],
    queryFn: () => apiClient<GoldAndTlData | null>("/tools/forex/gold-tl"),
    refetchInterval: 15 * 60_000,
  });
}

export function useCotReport() {
  return useQuery({
    queryKey: ["tools", "forex", "cot-report"],
    queryFn: () => apiClient<CotRow[]>("/tools/forex/cot-report"),
    refetchInterval: 60 * 60_000,
  });
}

export function useCorrelationMatrix() {
  return useQuery({
    queryKey: ["tools", "forex", "correlation-matrix"],
    queryFn: () => apiClient<CorrelationMatrix | null>("/tools/forex/correlation-matrix"),
    refetchInterval: 60 * 60_000,
  });
}

export function useTrending() {
  return useQuery({
    queryKey: ["tools", "crypto", "trending"],
    queryFn: () => apiClient<TrendingCoin[]>("/tools/crypto/trending"),
    refetchInterval: 15 * 60_000,
  });
}

export function useStablecoins() {
  return useQuery({
    queryKey: ["tools", "crypto", "stablecoins"],
    queryFn: () => apiClient<StablecoinFlowData | null>("/tools/crypto/stablecoins"),
    refetchInterval: 15 * 60_000,
  });
}

export function useAltcoinSeason() {
  return useQuery({
    queryKey: ["tools", "crypto", "altcoin-season"],
    queryFn: () => apiClient<AltcoinSeasonData | null>("/tools/crypto/altcoin-season"),
    refetchInterval: 60 * 60_000,
  });
}

export function useEtfFlows() {
  return useQuery({
    queryKey: ["tools", "crypto", "etf-flows"],
    queryFn: () => apiClient<EtfFlowsResponse>("/tools/crypto/etf-flows"),
    refetchInterval: 60 * 60_000,
  });
}

export function useOrderFlow(symbol: string) {
  return useQuery({
    queryKey: ["tools", "crypto", "order-flow", symbol],
    queryFn: () => apiClient<OrderFlowData>(`/tools/crypto/order-flow?symbol=${symbol}`),
    refetchInterval: 4000,
  });
}

export function useOrderFlowSymbols() {
  return useQuery({
    queryKey: ["tools", "crypto", "order-flow", "symbols"],
    queryFn: () => apiClient<string[]>("/tools/crypto/order-flow/symbols"),
    refetchInterval: 15 * 60_000,
  });
}

export function useOrderFlowHeatmap(symbol: string) {
  return useQuery({
    queryKey: ["tools", "crypto", "order-flow", "heatmap", symbol],
    queryFn: () => apiClient<HeatmapResponse>(`/tools/crypto/order-flow/heatmap?symbol=${symbol}`),
    refetchInterval: 2000,
  });
}

// ---------- Döngü göstergeleri ----------

export function useCbbi() {
  return useQuery({
    queryKey: ["tools", "crypto", "cycle", "cbbi"],
    queryFn: () => apiClient<CbbiData | null>("/tools/crypto/cycle/cbbi"),
    refetchInterval: 60 * 60_000,
  });
}

export function useCycleSnapshot() {
  return useQuery({
    queryKey: ["tools", "crypto", "cycle", "snapshot"],
    queryFn: () => apiClient<CycleSnapshot | null>("/tools/crypto/cycle/snapshot"),
    refetchInterval: 60 * 60_000,
  });
}

export function useCycleMacro() {
  return useQuery({
    queryKey: ["tools", "crypto", "cycle", "macro"],
    queryFn: () => apiClient<CycleMacro | null>("/tools/crypto/cycle/macro"),
    refetchInterval: 60 * 60_000,
  });
}

export function useExchangeFlows() {
  return useQuery({
    queryKey: ["tools", "crypto", "cycle", "exchange-flows"],
    queryFn: () => apiClient<ExchangeFlows | null>("/tools/crypto/cycle/exchange-flows"),
    refetchInterval: 60 * 60_000,
  });
}

export function useAhr999() {
  return useQuery({
    queryKey: ["tools", "crypto", "cycle", "ahr999"],
    queryFn: () => apiClient<Ahr999Data | null>("/tools/crypto/cycle/ahr999"),
    refetchInterval: 60 * 60_000,
  });
}

export function useTwoYearMaMultiplier() {
  return useQuery({
    queryKey: ["tools", "crypto", "cycle", "2y-ma-multiplier"],
    queryFn: () => apiClient<TwoYearMaMultiplierData | null>("/tools/crypto/cycle/2y-ma-multiplier"),
    refetchInterval: 60 * 60_000,
  });
}

export function useCycleRsiHeatmap() {
  return useQuery({
    queryKey: ["tools", "crypto", "cycle", "rsi-heatmap"],
    queryFn: () => apiClient<RsiHeatmapRow[]>("/tools/crypto/cycle/rsi-heatmap"),
    refetchInterval: 15 * 60_000,
  });
}

export function useLongShortRatio() {
  return useQuery({
    queryKey: ["tools", "crypto", "cycle", "long-short-ratio"],
    queryFn: () => apiClient<LongShortRow[]>("/tools/crypto/cycle/long-short-ratio"),
    refetchInterval: 15 * 60_000,
  });
}

export function useMarketPulse() {
  return useQuery({
    queryKey: ["tools", "crypto", "cycle", "market-pulse"],
    queryFn: () => apiClient<MarketPulse>("/tools/crypto/cycle/market-pulse"),
    refetchInterval: 60 * 60_000,
  });
}

export async function postDcaCalculator(params: {
  amountUsd: number;
  frequencyDays: number;
  startDate: string;
}) {
  return apiClient<DcaResult | { error: string }>("/tools/crypto/cycle/dca-calculator", {
    method: "POST",
    body: params,
  });
}
