"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { AdminPaymentList } from "@/lib/types/curriculum";

export function useAdminPayments(page: number, status: string, limit: number = 20) {
  return useQuery({
    queryKey: ["admin", "payments", page, status, limit],
    queryFn: () =>
      apiClient<AdminPaymentList>(
        `/payments?page=${page}&limit=${limit}${status ? `&status=${status}` : ""}`
      ),
  });
}

export function useApprovePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/payments/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
    },
  });
}

export function useRejectPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/payments/${id}/reject`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
    },
  });
}

export function useUpdateProgramPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (programPriceTRY: number) =>
      apiClient("/payments/price", { method: "POST", body: { programPriceTRY } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", "price"] });
    },
  });
}

export type PackageSalesPeriod = { period: string; revenue: number; count: number };
export type PackageSalesStats = {
  daily: PackageSalesPeriod[];
  monthly: PackageSalesPeriod[];
  yearly: PackageSalesPeriod[];
};

export function usePackageSalesStats() {
  return useQuery({
    queryKey: ["admin", "stats", "package-sales"],
    queryFn: () => apiClient<PackageSalesStats>("/manage/stats/package-sales"),
  });
}
