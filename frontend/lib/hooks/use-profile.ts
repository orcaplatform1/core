"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import type { ProfileFormValues } from "@/lib/schemas/auth";
import type { MyStats } from "@/lib/types/stats";

export type PublicProfile = {
  id: string;
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  gender: string;
  role: "GUEST" | "STUDENT" | "STAFF" | "SUPER_ADMIN";
  occupation: string | null;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
  online: boolean;
  performance: MyStats | null;
  userBadges: { earnedAt: string; badge: { name: string; iconUrl: string | null } }[];
  communityStats: { postsCount: number; likesReceived: number } | null;
  isBlockedByMe: boolean;
  hasBlockedMe: boolean;
};

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: ["users", userId, "public-profile"],
    queryFn: () => apiClient<PublicProfile>(`/users/${userId}/public-profile`),
    enabled: !!userId,
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient(`/users/${userId}/block`, { method: "POST" }),
    onSuccess: (_data, userId) => {
      qc.invalidateQueries({ queryKey: ["users", userId, "public-profile"] });
      qc.invalidateQueries({ queryKey: ["users", "me", "blocked"] });
    },
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient(`/users/${userId}/block`, { method: "DELETE" }),
    onSuccess: (_data, userId) => {
      qc.invalidateQueries({ queryKey: ["users", userId, "public-profile"] });
      qc.invalidateQueries({ queryKey: ["users", "me", "blocked"] });
    },
  });
}

export type BlockedUserRow = {
  id: string;
  createdAt: string;
  blocked: { id: string; fullName: string; username: string | null; avatarUrl: string | null };
};

export function useMyBlockedList(page: number) {
  return useQuery({
    queryKey: ["users", "me", "blocked", page],
    queryFn: () =>
      apiClient<{
        data: BlockedUserRow[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/users/me/blocked?page=${page}`),
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (payload: ProfileFormValues) =>
      apiClient("/users/me", { method: "PATCH", body: payload }),
  });
}

export function useExportMyData() {
  return useMutation({
    mutationFn: () => apiClient<Record<string, unknown>>("/users/me/export"),
  });
}

export function useRequestAccountDeletion() {
  return useMutation({
    mutationFn: () => apiClient("/users/me/delete", { method: "POST" }),
  });
}
