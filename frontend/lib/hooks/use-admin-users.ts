"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { AdminUserList } from "@/lib/types/curriculum";

export function useAdminUsers(page: number, limit: number = 20) {
  return useQuery({
    queryKey: ["admin", "users", page, limit],
    queryFn: () => apiClient<AdminUserList>(`/users?page=${page}&limit=${limit}`),
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
