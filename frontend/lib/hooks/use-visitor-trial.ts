"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type VisitorTrialStatus = {
  firstAccessAt: string;
  expiresAt: string;
  remainingSeconds: number;
  expired: boolean;
};

// Sadece giris yapmamis ziyaretciler icin cagrilir (bkz. VisitorTrialGate) -
// sunucu ilk cagrida imzali bir cerez koyar, sonraki cagrilarda o cerezden
// kalan sureyi hesaplar. auth:false: bu uc login gerektirmez.
export function useVisitorTrialStatus(enabled: boolean) {
  return useQuery({
    queryKey: ["visitor-trial", "status"],
    queryFn: () => apiClient<VisitorTrialStatus>("/visitor-trial/status", { auth: false }),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
