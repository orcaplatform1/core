"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useRequestPhoneVerification() {
  return useMutation({
    mutationFn: () =>
      apiClient<{ message: string }>("/auth/phone-verification/request", { method: "POST" }),
  });
}

export function useConfirmPhoneVerification() {
  return useMutation({
    mutationFn: (code: string) =>
      apiClient("/auth/phone-verification/confirm", { method: "POST", body: { code } }),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) =>
      apiClient("/auth/verify-email", { method: "POST", body: { token }, auth: false }),
  });
}
