"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type AirdropStatus = "UPCOMING" | "ACTIVE" | "ENDED";
export type AirdropDifficulty = "EASY" | "MEDIUM" | "HARD";

export type Airdrop = {
  id: string;
  title: string;
  slug: string;
  projectName: string;
  blockchain: string;
  category: string;
  logo: string | null;
  banner: string | null;
  description: string | null;
  website: string | null;
  twitter: string | null;
  discord: string | null;
  telegram: string | null;
  documentation: string | null;
  status: AirdropStatus;
  rewardType: string;
  estimatedReward: string | null;
  estimatedValueUSD: number | null;
  difficulty: AirdropDifficulty;
  completionTime: string | null;
  requiresKYC: boolean;
  requiresWallet: boolean;
  requiresDiscord: boolean;
  requiresTwitter: boolean;
  requiresTelegram: boolean;
  startDate: string | null;
  endDate: string | null;
  snapshotDate: string | null;
  claimDate: string | null;
  aiScore: number;
  riskScore: number;
  featured: boolean;
  isAd: boolean;
  adExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AirdropQuery = {
  page?: number;
  limit?: number;
  q?: string;
  blockchain?: string;
  category?: string;
  status?: AirdropStatus;
  difficulty?: AirdropDifficulty;
  requiresKYC?: boolean;
  requiresWallet?: boolean;
  minReward?: number;
  maxReward?: number;
};

export type AirdropListResult = {
  data: Airdrop[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

function buildQueryString(query: AirdropQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function useAirdropListEndpoint(endpoint: string, query: AirdropQuery = {}) {
  return useQuery({
    queryKey: ["airdrops", endpoint, query],
    queryFn: () => apiClient<AirdropListResult>(`/airdrops${endpoint}${buildQueryString(query)}`, { auth: false }),
  });
}

export function useAirdrops(query: AirdropQuery = {}) {
  return useAirdropListEndpoint("", query);
}

export function useFeaturedAirdrops(query: AirdropQuery = {}) {
  return useAirdropListEndpoint("/featured", query);
}

export function useUpcomingAirdrops(query: AirdropQuery = {}) {
  return useAirdropListEndpoint("/upcoming", query);
}

export function useActiveAirdrops(query: AirdropQuery = {}) {
  return useAirdropListEndpoint("/active", query);
}

export function useAirdrop(slug: string) {
  return useQuery({
    queryKey: ["airdrops", "detail", slug],
    queryFn: () => apiClient<Airdrop>(`/airdrops/${slug}`, { auth: false }),
    enabled: !!slug,
  });
}

// ---------- Admin ----------

export type AirdropPayload = Partial<Omit<Airdrop, "id" | "createdAt" | "updatedAt">>;

export function useAdminCreateAirdrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AirdropPayload) => apiClient<Airdrop>("/admin/airdrops", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["airdrops"] }),
  });
}

export function useAdminUpdateAirdrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & AirdropPayload) =>
      apiClient<Airdrop>(`/admin/airdrops/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["airdrops"] }),
  });
}

export function useAdminDeleteAirdrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/admin/airdrops/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["airdrops"] }),
  });
}
