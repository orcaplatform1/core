"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { DEFAULT_SITE_CONTENT } from "@/lib/marketing/default-site-content";
import type { SiteContentSettings } from "@/lib/marketing/site-content-types";

function mergeDefined(data: Partial<SiteContentSettings>): SiteContentSettings {
  const result = { ...DEFAULT_SITE_CONTENT };
  for (const key of Object.keys(data) as (keyof SiteContentSettings)[]) {
    const value = data[key];
    if (value !== null && value !== undefined) {
      (result as any)[key] = value;
    }
  }
  return result;
}

export function useSiteContent() {
  return useQuery({
    queryKey: ["site-content"],
    queryFn: async () => {
      const data = await apiClient<SiteContentSettings>("/site-content", { auth: false });
      return mergeDefined(data);
    },
  });
}

export function useUpdateSiteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<SiteContentSettings>) =>
      apiClient<SiteContentSettings>("/site-content", { method: "PATCH", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-content"] }),
  });
}
