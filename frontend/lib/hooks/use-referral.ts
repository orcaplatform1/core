"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface ReferralStats {
  code: string;
  invitedCount: number;
  creditsEarned: number;
}

export function useReferralStats() {
  return useQuery({
    queryKey: ["referral", "stats"],
    queryFn: () => apiClient<ReferralStats>("/users/me/referral-stats"),
  });
}
