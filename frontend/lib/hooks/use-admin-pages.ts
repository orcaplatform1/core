"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PageBlock } from "@/lib/marketing/page-blocks-types";

export type AdminPage = {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  blocks: PageBlock[];
  visibility: string[];
  showInFooter: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type PagePayload = {
  slug: string;
  title: string;
  blocks: PageBlock[];
  visibility?: string[];
  showInFooter?: boolean;
  order?: number;
};

export function useAdminPages() {
  return useQuery({
    queryKey: ["admin", "pages"],
    queryFn: () => apiClient<AdminPage[]>("/pages"),
  });
}

export function usePageBySlug(slug: string | null) {
  return useQuery({
    queryKey: ["page", slug],
    queryFn: () => apiClient<AdminPage>(`/pages/${slug}`),
    enabled: !!slug,
    retry: false,
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PagePayload) => apiClient<AdminPage>("/pages", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "pages"] }),
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<PagePayload>) =>
      apiClient<AdminPage>(`/pages/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "pages"] }),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/pages/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "pages"] }),
  });
}
