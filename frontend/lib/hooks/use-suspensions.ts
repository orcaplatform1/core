"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type Suspension = {
  id: string;
  type: "COMMENT" | "DM";
  reason: string | null;
  expiresAt: string;
  createdAt: string;
  issuedBy: { id: string; fullName: string; username: string | null };
};

export function useIssueSuspension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, type, days, reason }: { userId: string; type: "COMMENT" | "DM"; days: 1 | 3 | 7; reason?: string }) =>
      apiClient(`/manage/users/${userId}/suspend`, { method: "POST", body: { type, days, reason } }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["users", vars.userId, "suspensions"] });
      qc.invalidateQueries({ queryKey: ["admin", "suspensions"] });
    },
  });
}

export function useUserSuspensionHistory(userId: string) {
  return useQuery({
    queryKey: ["users", userId, "suspensions"],
    queryFn: () => apiClient<Suspension[]>(`/manage/users/${userId}/suspensions`),
    enabled: !!userId,
  });
}
