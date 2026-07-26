"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { DEFAULT_FOOTER_SETTINGS } from "@/lib/marketing/default-site-content";
import type { FooterSettingsData } from "@/lib/marketing/site-content-types";

function mergeDefined(data: Partial<FooterSettingsData>): FooterSettingsData {
  const result = { ...DEFAULT_FOOTER_SETTINGS };
  for (const key of Object.keys(data) as (keyof FooterSettingsData)[]) {
    const value = data[key];
    if (value !== null && value !== undefined) {
      (result as any)[key] = value;
    }
  }
  return result;
}

export function useFooterSettings() {
  return useQuery({
    queryKey: ["footer-settings"],
    queryFn: async () => {
      const data = await apiClient<FooterSettingsData>("/footer", { auth: false });
      return mergeDefined(data);
    },
  });
}

export function useUpdateFooterSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<FooterSettingsData>) =>
      apiClient<FooterSettingsData>("/footer", { method: "PATCH", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["footer-settings"] }),
  });
}
