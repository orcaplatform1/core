"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type AdminBadge = {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  triggerType: "FIRST_LESSON" | "QUIZ_PASS_COUNT" | "STREAK_DAYS" | "BACKTEST_COUNT" | "SIMULATION_COUNT" | "CUSTOM";
  requiredCount: number;
  createdAt: string;
};

export function useAdminBadges() {
  return useQuery({
    queryKey: ["admin", "badges"],
    queryFn: () => apiClient<AdminBadge[]>("/badges"),
  });
}

type BadgePayload = {
  name: string;
  description: string;
  iconUrl?: string;
  triggerType?: AdminBadge["triggerType"];
  requiredCount?: number;
};

export function useCreateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BadgePayload) => apiClient<AdminBadge>("/badges", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "badges"] }),
  });
}

export function useUpdateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<BadgePayload>) =>
      apiClient<AdminBadge>(`/badges/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "badges"] }),
  });
}

export function useDeleteBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/badges/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "badges"] }),
  });
}

export function useGrantBadge() {
  return useMutation({
    mutationFn: (payload: { badgeId: string; userId: string }) =>
      apiClient(`/badges/${payload.badgeId}/grant`, { method: "POST", body: { userId: payload.userId } }),
  });
}
