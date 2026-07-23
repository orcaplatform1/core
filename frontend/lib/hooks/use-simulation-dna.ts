"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { SimulationDnaReport } from "@/lib/types/curriculum";

export function useMySimulationDnaReports() {
  return useQuery({
    queryKey: ["simulation-dna", "me"],
    queryFn: () => apiClient<SimulationDnaReport[]>("/simulation-dna/me"),
  });
}
