"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  MyStats,
  CategoryBreakdownItem,
  TodayRecommendation,
  DailyQuote,
  BadgeItem,
  PnlPoint,
} from "@/lib/types/stats";

export function useMyStats() {
  return useQuery({
    queryKey: ["stats", "me"],
    queryFn: () => apiClient<MyStats>("/stats/me"),
  });
}

export function useCategoryBreakdown() {
  return useQuery({
    queryKey: ["stats", "categories"],
    queryFn: () => apiClient<CategoryBreakdownItem[]>("/stats/me/categories"),
  });
}

export function useTodayRecommendations() {
  return useQuery({
    queryKey: ["stats", "today"],
    queryFn: () => apiClient<TodayRecommendation[]>("/stats/me/today"),
  });
}

export function useDailyQuote() {
  return useQuery({
    queryKey: ["quotes", "today"],
    queryFn: () => apiClient<DailyQuote>("/quotes/today"),
    staleTime: 60 * 60 * 1000,
  });
}

export function useMyBadges() {
  return useQuery({
    queryKey: ["badges", "me"],
    queryFn: () => apiClient<BadgeItem[]>("/badges/me"),
  });
}

export function useBacktestChart() {
  return useQuery({
    queryKey: ["stats", "backtest-chart"],
    queryFn: () => apiClient<PnlPoint[]>("/stats/me/backtest-chart"),
  });
}

export function useSimulationChart() {
  return useQuery({
    queryKey: ["stats", "simulation-chart"],
    queryFn: () => apiClient<PnlPoint[]>("/stats/me/simulation-chart"),
  });
}
