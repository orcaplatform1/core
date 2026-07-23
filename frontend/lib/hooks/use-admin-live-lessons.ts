"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type AdminLiveLesson = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  discordLink: string;
  createdAt: string;
};

export function useAdminLiveLessons() {
  return useQuery({
    queryKey: ["admin", "live-lessons"],
    queryFn: () => apiClient<AdminLiveLesson[]>("/live-lessons"),
  });
}

type LiveLessonPayload = {
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  discordLink: string;
};

export function useCreateLiveLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LiveLessonPayload) =>
      apiClient<AdminLiveLesson>("/live-lessons", { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "live-lessons"] });
      qc.invalidateQueries({ queryKey: ["live-lessons", "next"] });
    },
  });
}

export function useDeleteLiveLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/live-lessons/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "live-lessons"] });
      qc.invalidateQueries({ queryKey: ["live-lessons", "next"] });
    },
  });
}
