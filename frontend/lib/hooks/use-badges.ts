"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { MyBadge, StreakUpdate } from "@/lib/types/curriculum";

export function useMyBadges() {
  return useQuery({
    queryKey: ["badges", "me"],
    queryFn: () => apiClient<MyBadge[]>("/badges/me"),
  });
}

export function useUpdateStreakGoal() {
  return useMutation({
    mutationFn: (streakGoalDays: number) =>
      apiClient<{ streakGoalDays: number }>("/streak/goal", {
        method: "PATCH",
        body: { streakGoalDays },
      }),
  });
}
