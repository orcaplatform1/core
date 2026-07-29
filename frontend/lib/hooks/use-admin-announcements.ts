"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

type AnnouncementPayload = {
  title: string;
  message: string;
  target: "ALL" | "PAID" | "FREE";
  link?: string;
};

export type AnnouncementBroadcast = {
  id: string;
  title: string;
  message: string;
  target: "ALL" | "PAID" | "FREE";
  link: string | null;
  createdByName: string | null;
  createdAt: string;
  recipientCount: number;
};

export function useBroadcastAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AnnouncementPayload) =>
      apiClient("/manage/announcements", { method: "POST", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
  });
}

export function useAdminAnnouncementsList() {
  return useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: () => apiClient<AnnouncementBroadcast[]>("/manage/announcements"),
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/manage/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
  });
}
