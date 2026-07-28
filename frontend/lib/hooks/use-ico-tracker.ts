"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type IcoStatus = "UPCOMING" | "ACTIVE" | "ENDED";

export interface IcoProject {
  id: string;
  externalId: string;
  name: string;
  tokenSymbol: string | null;
  status: IcoStatus;
  raisedAmountUsd: number | null;
  ratingScore: number | null;
  startDate: string | null;
  endDate: string | null;
  websiteUrl: string | null;
  description: string | null;
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
