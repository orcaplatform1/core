"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ProfileFormValues } from "@/lib/schemas/auth";

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
