"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { BacktestSymbols, Candle, ChartDrawingData } from "@/lib/types/curriculum";

export function useBacktestSymbols() {
  return useQuery({
    queryKey: ["backtest", "symbols"],
    queryFn: () => apiClient<BacktestSymbols>("/backtest/symbols"),
  });
}

export function useCandles(symbol: string, timeframe: string, from: string, to: string) {
  return useQuery({
    queryKey: ["backtest", "candles", symbol, timeframe, from, to],
    queryFn: () =>
      apiClient<Candle[]>(
        `/backtest/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      ),
    enabled: !!symbol && !!from && !!to,
  });
}

export function useRefreshSymbol() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { symbol: string; timeframe: string }) =>
      apiClient("/backtest/candles/refresh", {
        method: "POST",
        body: payload,
      }),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ["backtest", "candles", payload.symbol] });
    },
  });
}

export function useChartDrawing(context: string, symbol: string) {
  return useQuery({
    queryKey: ["chart-drawings", context, symbol],
    queryFn: () =>
      apiClient<{ drawings: ChartDrawingData } | null>(
        `/chart-drawings?context=${encodeURIComponent(context)}&symbol=${encodeURIComponent(symbol)}`
      ),
    enabled: !!symbol,
  });
}

export function useSaveChartDrawing() {
  return useMutation({
    mutationFn: (payload: { context: string; symbol: string; drawings: ChartDrawingData }) =>
      apiClient("/chart-drawings", {
        method: "POST",
        body: payload,
      }),
  });
}
