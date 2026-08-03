"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type VisitorStats = { today: number; week: number; month: number };

export type RoleCounts = { GUEST: number; STUDENT: number; STAFF: number; SUPER_ADMIN: number };

export type ActiveUser = {
  id: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: "GUEST" | "STUDENT" | "STAFF" | "SUPER_ADMIN";
  gender: "ERKEK" | "KADIN" | null;
};

export type GuestRow = {
  id: string;
  username: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
};

export function useVisitorStats() {
  return useQuery({
    queryKey: ["admin", "analytics", "visitors"],
    queryFn: () => apiClient<VisitorStats>("/manage/analytics/visitors"),
    refetchInterval: 60_000,
  });
}

export function useRoleCounts() {
  return useQuery({
    queryKey: ["admin", "analytics", "role-counts"],
    queryFn: () => apiClient<RoleCounts>("/manage/analytics/role-counts"),
    refetchInterval: 60_000,
  });
}

export function useActiveUsers() {
  return useQuery({
    queryKey: ["admin", "analytics", "active-users"],
    queryFn: () => apiClient<ActiveUser[]>("/manage/analytics/active-users"),
    refetchInterval: 15_000,
  });
}

export function useGuestList(page: number, enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "analytics", "guests", page],
    queryFn: () =>
      apiClient<{ data: GuestRow[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        `/manage/analytics/guests?page=${page}`,
      ),
    enabled,
  });
}
