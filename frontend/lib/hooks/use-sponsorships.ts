"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Payment } from "@/lib/types/curriculum";

export type SponsorshipType = "ICO" | "AIRDROP";
export type SponsorshipStatus = "AWAITING_PAYMENT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export type SponsorshipPricing = { 7: number; 15: number; 30: number };

export type Sponsorship = {
  id: string;
  userId: string;
  type: SponsorshipType;
  status: SponsorshipStatus;
  durationDays: number;
  priceUsd: number;
  contactName: string;
  contactEmail: string;
  contactTelegram: string | null;
  formData: Record<string, unknown>;
  paymentId: string | null;
  createdIcoId: string | null;
  createdAirdropId: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName: string; username: string | null; email: string | null };
};

export function useSponsorshipPricing() {
  return useQuery({
    queryKey: ["sponsorships", "pricing"],
    queryFn: () => apiClient<SponsorshipPricing>("/sponsorships/pricing", { auth: false }),
  });
}

export function useCreateSponsorship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      type: SponsorshipType;
      durationDays: 7 | 15 | 30;
      contactName: string;
      contactEmail: string;
      contactTelegram?: string;
      formData: Record<string, unknown>;
    }) => apiClient<Sponsorship>("/sponsorships", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsorships", "me"] }),
  });
}

export function useMySponsorships() {
  return useQuery({
    queryKey: ["sponsorships", "me"],
    queryFn: () => apiClient<Sponsorship[]>("/sponsorships/me"),
  });
}

export type SponsorshipPaymentResult = Payment & { checkoutUrl?: string; walletInfo?: { walletAddress: string; network: string; note: string } };

export function useCreateSponsorshipPayment() {
  return useMutation({
    mutationFn: (payload: {
      sponsorshipId: string;
      cryptoProvider: "BINANCE" | "OKX" | "BYBIT";
      cryptoAsset: "BTC" | "ETH" | "BNB" | "USDT";
    }) =>
      apiClient<SponsorshipPaymentResult>("/payments", {
        method: "POST",
        body: {
          currency: "TRY",
          method: "CRYPTO",
          purpose: "SPONSORSHIP",
          sponsorshipId: payload.sponsorshipId,
          cryptoProvider: payload.cryptoProvider,
          cryptoAsset: payload.cryptoAsset,
        },
      }),
  });
}

// ---------- Admin ----------

export function useAdminSponsorships(status?: string) {
  return useQuery({
    queryKey: ["admin", "sponsorships", status],
    queryFn: () => apiClient<Sponsorship[]>(`/manage/sponsorships${status ? `?status=${status}` : ""}`),
  });
}

export function useApproveSponsorship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/manage/sponsorships/${id}/approve`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "sponsorships"] }),
  });
}

export function useRejectSponsorship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient(`/manage/sponsorships/${id}/reject`, { method: "POST", body: { reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "sponsorships"] }),
  });
}

export type SponsorshipStatBucket = {
  ico: { revenueUsd: number; count: number };
  airdrop: { revenueUsd: number; count: number };
  total: { revenueUsd: number; count: number };
};

export function useSponsorshipStats() {
  return useQuery({
    queryKey: ["admin", "sponsorships", "stats"],
    queryFn: () =>
      apiClient<{ thisWeek: SponsorshipStatBucket; thisMonth: SponsorshipStatBucket; thisYear: SponsorshipStatBucket }>(
        "/manage/sponsorships/stats",
      ),
  });
}
