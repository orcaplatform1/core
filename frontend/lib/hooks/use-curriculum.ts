"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  Program,
  CourseModule,
  LessonSummary,
  LessonDetail,
  LessonResource,
  Enrollment,
  ProgressRow,
  Certificate,
  CertificateStatus,
  LessonNote,
  LessonTaskWithProgress,
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

export function useMyLessonNote(lessonId: string) {
  return useQuery({
    queryKey: ["lesson-notes", "me", lessonId],
    queryFn: () => apiClient<LessonNote | null>(`/lessons/${lessonId}/notes/me`),
    enabled: !!lessonId,
  });
}

export function useSaveLessonNote(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiClient<LessonNote | null>(`/lessons/${lessonId}/notes/me`, {
        method: "PUT",
        body: { content },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["lesson-notes", "me", lessonId], data);
    },
  });
}

export function useLessonTask(lessonId: string) {
  return useQuery({
    queryKey: ["lesson-task", lessonId],
    queryFn: () => apiClient<LessonTaskWithProgress>(`/lessons/${lessonId}/task`),
    enabled: !!lessonId,
  });
}

export function useSetMyTaskProgress(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (completedCount: number) =>
      apiClient(`/lessons/${lessonId}/task/progress`, {
        method: "PUT",
        body: { completedCount },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-task", lessonId] });
    },
  });
}

export function useAddLessonResource(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; url: string }) =>
      apiClient<LessonResource>(`/lessons/${lessonId}/resources`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", lessonId] });
    },
  });
}

export function useRemoveLessonResource(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: string) =>
      apiClient<{ message: string }>(`/lessons/resources/${resourceId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", lessonId] });
    },
  });
}
