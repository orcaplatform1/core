"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type ReferrerOverview = {
  id: string;
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  invitedCount: number;
  creditsEarned: number;
};

export type ReferralInvitee = {
  id: string;
  fullName: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type ReferralEarningsPeriod = { period: string; count: number; creditsAwarded: number };
export type ReferralEarningsStats = {
  daily: ReferralEarningsPeriod[];
  monthly: ReferralEarningsPeriod[];
  yearly: ReferralEarningsPeriod[];
};

export function useReferralOverview() {
  return useQuery({
    queryKey: ["admin", "referrals", "overview"],
    queryFn: () => apiClient<ReferrerOverview[]>("/manage/referrals"),
  });
}

export function useReferralInvitees(userId: string | null) {
  return useQuery({
    queryKey: ["admin", "referrals", "invitees", userId],
    queryFn: () => apiClient<ReferralInvitee[]>(`/manage/referrals/${userId}/invitees`),
    enabled: !!userId,
  });
}

export function useReferralEarningsStats() {
  return useQuery({
    queryKey: ["admin", "referrals", "earnings"],
    queryFn: () => apiClient<ReferralEarningsStats>("/manage/referrals/stats/earnings"),
  });
}
