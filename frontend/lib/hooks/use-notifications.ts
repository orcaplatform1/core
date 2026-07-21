"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Notification } from "@/lib/types/curriculum";

export function useMyNotifications() {
  return useQuery({
    queryKey: ["notifications", "me"],
    queryFn: () => apiClient<Notification[]>("/notifications/me"),
    refetchInterval: 60000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => apiClient<{ count: number }>("/notifications/me/unread-count"),
    refetchInterval: 60000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient("/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMyAnnouncements() {
  return useQuery({
    queryKey: ["notifications", "inbox"],
    queryFn: () => apiClient<Notification[]>("/notifications/me/inbox"),
  });
}

export function useAnnouncementUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "inbox", "unread-count"],
    queryFn: () => apiClient<{ count: number }>("/notifications/me/inbox/unread-count"),
    refetchInterval: 60000,
  });
}

export function useMarkAllAnnouncementsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient("/notifications/inbox/read-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "inbox"] });
    },
  });
}
