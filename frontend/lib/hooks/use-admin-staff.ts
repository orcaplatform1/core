"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type StaffPerformance = {
  staffId: string;
  fullName: string;
  promoCode: string | null;
  testsGiven: number;
  conversions: number;
  notConvertedYet: number;
  totalSales: number;
  totalCommission: number;
};

export function useStaffPerformance() {
  return useQuery({
    queryKey: ["admin", "staff-performance"],
    queryFn: () => apiClient<StaffPerformance[]>("/manage/staff/performance"),
  });
}
