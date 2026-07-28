"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type SentimentTrendPoint = { date: string; avgScore: number };

export type SentimentLabel = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

export type SentimentArticle = {
  id: string;
  source: string;
  title: string;
  url: string;
  publishedAt: string;
  sentimentLabel: SentimentLabel;
  sentimentScore: number;
};

export type NewsSentimentOverview = {
  trend: SentimentTrendPoint[];
  articles: SentimentArticle[];
};

export function useNewsSentiment() {
  return useQuery({
    queryKey: ["tools", "crypto", "sentiment"],
    queryFn: () => apiClient<NewsSentimentOverview>("/tools/crypto/sentiment"),
    refetchInterval: 1000 * 60 * 10,
  });
}
