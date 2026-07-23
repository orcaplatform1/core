"use client";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

type AnnouncementPayload = {
  title: string;
  message: string;
  target: "ALL" | "PAID" | "FREE";
  link?: string;
};

export function useBroadcastAnnouncement() {
  return useMutation({
    mutationFn: (payload: AnnouncementPayload) =>
      apiClient("/manage/announcements", { method: "POST", body: payload }),
  });
}
