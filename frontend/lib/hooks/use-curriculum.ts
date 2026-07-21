"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  Program,
  CourseModule,
  LessonSummary,
  LessonDetail,
  Enrollment,
  ProgressRow,
  Certificate,
  CertificateStatus,
} from "@/lib/types/curriculum";

export function usePrograms() {
  return useQuery({
    queryKey: ["programs"],
    queryFn: () => apiClient<Program[]>("/programs", { auth: false }),
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: ["programs", id],
    queryFn: () => apiClient<Program>(`/programs/${id}`, { auth: false }),
    enabled: !!id,
  });
}

export function useAllModules() {
  return useQuery({
    queryKey: ["modules"],
    queryFn: () => apiClient<CourseModule[]>("/modules", { auth: false }),
  });
}

export function useAllLessons() {
  return useQuery({
    queryKey: ["lessons"],
    queryFn: () => apiClient<LessonSummary[]>("/lessons", { auth: false }),
  });
}

export function useLesson(id: string) {
  return useQuery({
    queryKey: ["lessons", id],
    queryFn: () => apiClient<LessonDetail>(`/lessons/${id}`),
    enabled: !!id,
    retry: false,
  });
}

export function useMyEnrollments() {
  return useQuery({
    queryKey: ["enrollments", "me"],
    queryFn: () => apiClient<Enrollment[]>("/enrollments/me"),
  });
}

export function useMyProgress() {
  return useQuery({
    queryKey: ["progress", "me"],
    queryFn: () => apiClient<ProgressRow[]>("/progress/me"),
  });
}

export function useUpdateWatchProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { lessonId: string; watchedSeconds: number }) =>
      apiClient<ProgressRow & { completed: boolean }>("/progress/watch", {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["progress", "me"] });
      if (data.completed) {
        queryClient.invalidateQueries({ queryKey: ["stats"] });
      }
    },
  });
}

export function useMyCertificateStatus() {
  return useQuery({
    queryKey: ["certificates", "me", "status"],
    queryFn: () => apiClient<CertificateStatus>("/certificates/me/status"),
  });
}

export function useIssueCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient<Certificate>("/certificates", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates", "me", "status"] });
    },
  });
}
