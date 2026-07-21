"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Payment } from "@/lib/types/curriculum";

export function useProgramPrice() {
  return useQuery({
    queryKey: ["payments", "price"],
    queryFn: () => apiClient<{ programPriceTRY: number }>("/payments/price", { auth: false }),
  });
}

export function useMyPayments() {
  return useQuery({
    queryKey: ["payments", "me"],
    queryFn: () => apiClient<Payment[]>("/payments/me"),
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      currency: string;
      method: "CARD" | "BANK_TRANSFER" | "MOBILE";
      receiptUrl?: string;
      promoCode?: string;
      purpose?: "PROGRAM" | "MENTOR_CREDITS";
      creditAmount?: 100 | 250 | 500;
    }) => apiClient<Payment>("/payments", { method: "POST", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", "me"] });
    },
  });
}
