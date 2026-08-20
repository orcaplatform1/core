"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// Money Maker'daki use-admin-scanner.ts hook/query-key desenine birebir
// uyar - Terminal News Trade Orca ACS/Money Maker'dan TAMAMEN bağımsız,
// kendi backend prefix'i (/terminal-news-trade) ve kendi query-key
// namespace'i ("terminal-news-trade") var.

export type TerminalNewsTradeConfig = {
  id: string;
  enabled: boolean;
  testnet: boolean;
  shadowMode: boolean;
  riskPerTradeUsdt: number;
  leverage: number;
  updatedAt: string;
  apiKeyConfigured: boolean;
  xApiConfigured: boolean;
  aiConfigured: boolean;
  testnetActive: boolean;
};

export type NewsCategory =
  | "EXCHANGE_HACK_OR_INSOLVENCY"
  | "OFFICIAL_MA_ACQUISITION"
  | "MACRO_SURPRISE"
  | "VERIFIED_INFLUENCER"
  | "PARTNERSHIP_INTEGRATION"
  | "EXCHANGE_LISTING"
  | "MAINNET_UPGRADE"
  | "REGULATORY"
  | "TOKEN_UNLOCK"
  | "ETF_DECISION"
  | "UNVERIFIED_OTHER";

export type NewsEvent = {
  id: string;
  sourceUrl: string;
  sourceAccount: string;
  rawText: string;
  publishedAt: string;
  category: NewsCategory | null;
  direction: "LONG" | "SHORT" | "NEUTRAL" | null;
  confidenceScore: number | null;
  tradable: boolean;
  verified: boolean;
  verificationNotes: string | null;
  aiSummary: string | null;
  trade?: NewsTrade | null;
};

export type NewsTrade = {
  id: string;
  newsEventId: string;
  symbol: string;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  status: "PENDING_ENTRY" | "OPEN" | "CLOSED" | "FAILED" | "SHADOW_ONLY";
  entryPrice: number | null;
  qty: number | null;
  pivotStopPrice: number | null;
  entryLatencyMs: number | null;
  entryLatencyNote: string | null;
  closeReason: string | null;
  realizedPnl: number | null;
  commission: number | null;
  funding: number | null;
  netPnl: number | null;
  errorMessage: string | null;
  createdAt: string;
  newsEvent?: NewsEvent;
};

export type TerminalNewsTradeStats = {
  totalClosed: number;
  wins: number;
  losses: number;
  winRate: number | null;
  totalRealizedPnl: number;
  totalCommission: number;
  totalFunding: number;
  totalNetPnl: number;
};

export type LiveTerminalNewsTradePosition = {
  id: string;
  symbol: string;
  direction: string;
  status: "OPEN";
  entryPrice: number | null;
  qty: number | null;
  pivotStopPrice: number | null;
  entryLatencyMs: number | null;
  entryLatencyNote: string | null;
  markPrice: number | null;
  unrealizedProfit: number | null;
  notional: number | null;
  leverage: number | null;
  liquidationPrice: number | null;
  realizedSoFar: number;
  commissionSoFar: number;
  fundingSoFar: number;
  newsSourceUrl: string;
  newsSummary: string | null;
  newsVerified: boolean;
  newsVerificationNotes: string | null;
  newsCategory: NewsCategory | null;
};

export function useTerminalNewsTradeConfig() {
  return useQuery({
    queryKey: ["admin", "terminal-news-trade", "config"],
    queryFn: () => apiClient<TerminalNewsTradeConfig>(`/terminal-news-trade/config`),
    refetchInterval: 30000,
  });
}
export function useUpdateTerminalNewsTradeConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Pick<TerminalNewsTradeConfig, "enabled" | "shadowMode" | "riskPerTradeUsdt" | "leverage">>) =>
      apiClient<TerminalNewsTradeConfig>(`/terminal-news-trade/config`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "terminal-news-trade", "config"] }),
  });
}
export function useTerminalNewsTradeStats() {
  return useQuery({
    queryKey: ["admin", "terminal-news-trade", "stats"],
    queryFn: () => apiClient<TerminalNewsTradeStats>(`/terminal-news-trade/stats`),
    refetchInterval: 30000,
  });
}
export function useTerminalNewsTradePositions() {
  return useQuery({
    queryKey: ["admin", "terminal-news-trade", "positions"],
    queryFn: () => apiClient<LiveTerminalNewsTradePosition[]>(`/terminal-news-trade/positions`),
    refetchInterval: 5000,
  });
}
export function useTerminalNewsTrades() {
  return useQuery({
    queryKey: ["admin", "terminal-news-trade", "trades"],
    queryFn: () => apiClient<NewsTrade[]>(`/terminal-news-trade/trades`),
    refetchInterval: 15000,
  });
}
export function useTerminalNewsEvents() {
  return useQuery({
    queryKey: ["admin", "terminal-news-trade", "events"],
    queryFn: () => apiClient<NewsEvent[]>(`/terminal-news-trade/events`),
    refetchInterval: 15000,
  });
}
export function useCloseTerminalNewsTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient<{ closed: boolean }>(`/terminal-news-trade/${id}/close`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "terminal-news-trade"] }),
  });
}
// X API henuz baglanmadan (X_API_BEARER_TOKEN bos) tum pipeline'i test etmek
// icin - X stream'in gercekte iletecegi olayin AYNISINI elle tetikler.
export function useSendTestNewsEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { rawText: string; sourceAccount?: string }) =>
      apiClient<{ queued: boolean }>(`/terminal-news-trade/test-event`, { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "terminal-news-trade"] }),
  });
}
export function useCloseAllTerminalNewsTrades() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient<{ closed: number }>(`/terminal-news-trade/close-all`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "terminal-news-trade"] }),
  });
}
