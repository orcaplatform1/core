"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type IcoStatus = "UPCOMING" | "ACTIVE" | "ENDED";

export interface IcoProject {
  id: string;
  externalId: string | null;
  name: string;
  tokenSymbol: string | null;
  status: IcoStatus;
  raisedAmountUsd: number | null;
  ratingScore: number | null;
  startDate: string | null;
  endDate: string | null;
  websiteUrl: string | null;
  description: string | null;
  logo: string | null;
  blockchain: string | null;
  category: string | null;
  saleType: string | null;
  launchpad: string | null;
  launchpadUrl: string | null;
  tokenPrice: number | null;
  hardCapUsd: number | null;
  valuationUsd: number | null;
  allocationDetails: string | null;
  requiresKYC: boolean;
  requiresWhitelist: boolean;
  twitter: string | null;
  telegram: string | null;
  discord: string | null;
  isAd: boolean;
  adExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useIcoProjects() {
  return useQuery({
    queryKey: ["tools", "crypto", "ico"],
    queryFn: () => apiClient<IcoProject[]>("/tools/crypto/ico"),
    refetchInterval: 60 * 60_000,
  });
}

export function useIcoProject(id: string) {
  const { data } = useIcoProjects();
  return data?.find((p) => p.id === id);
}

// ---------- Admin ----------

export type IcoProjectPayload = Partial<Omit<IcoProject, "id" | "externalId" | "createdAt" | "updatedAt">>;

export function useAdminCreateIco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: IcoProjectPayload) =>
      apiClient<IcoProject>("/admin/ico-projects", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tools", "crypto", "ico"] }),
  });
}

export function useAdminUpdateIco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & IcoProjectPayload) =>
      apiClient<IcoProject>(`/admin/ico-projects/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tools", "crypto", "ico"] }),
  });
}

export function useAdminDeleteIco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/admin/ico-projects/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tools", "crypto", "ico"] }),
  });
}
