"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { AdminUserList } from "@/lib/types/curriculum";

export function useAdminUsers(page: number, limit: number = 20, search: string = "") {
  return useQuery({
    queryKey: ["admin", "users", page, limit, search],
    queryFn: () =>
      apiClient<AdminUserList>(
        `/users?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`
      ),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; role: string }) =>
      apiClient(`/users/${payload.id}/role`, {
        method: "PATCH",
        body: { role: payload.role },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useGrantEnrollment() {
  return useMutation({
    mutationFn: (payload: { id: string; programId: string }) =>
      apiClient(`/users/${payload.id}/enrollments`, {
        method: "POST",
        body: { programId: payload.programId },
      }),
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient(`/users/${id}/unban`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
export function useUserDetail(id: string) {
  return useQuery({
    queryKey: ["admin", "users", "detail", id],
    queryFn: () => apiClient<any>(`/users/${id}/detail`),
    enabled: !!id,
  });
}
export function useAdminUpdateProfile(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiClient(`/users/${id}/profile`, { method: "PATCH", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "detail", id] });
    },
  });
}
export function useAdminUpdateIdentity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { fullName?: string; username?: string }) =>
      apiClient(`/users/${id}/identity`, { method: "PATCH", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "detail", id] });
    },
  });
}
export function useAdjustMentorCredits(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (delta: number) =>
      apiClient(`/users/${id}/mentor-credits`, { method: "PATCH", body: { delta } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "detail", id] });
    },
  });
}
export function useBanUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (days: number) =>
      apiClient(`/users/${id}/ban`, { method: "POST", body: { days } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "detail", id] });
    },
  });
}
export function useResetBanCount(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient(`/users/${id}/reset-ban-count`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "detail", id] });
    },
  });
}
export function useRevokeEnrollment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (programId: string) =>
      apiClient(`/users/${id}/enrollments/${programId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "detail", id] });
    },
  });
}
export function useAdminDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
