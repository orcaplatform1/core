"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Program, CourseModule, LessonSummary, Category } from "@/lib/types/curriculum";

// ---- Categories ----
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient<Category[]>("/categories", { auth: false }),
  });
}
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiClient<Category>("/categories", { method: "POST", body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}
export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

// ---- Programs ----
type ProgramPayload = {
  title: string;
  description?: string;
  categoryId?: string;
  coverImageUrl?: string;
  level?: "BASLANGIC" | "ORTA" | "ILERI";
  durationHours?: number;
};
export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProgramPayload) => apiClient<Program>("/programs", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });
}
export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<ProgramPayload>) =>
      apiClient<Program>(`/programs/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });
}
export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/programs/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });
}

// ---- Modules ----
type ModulePayload = { title: string; description?: string; programId: string; order?: number };
export function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ModulePayload) => apiClient<CourseModule>("/modules", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modules"] }),
  });
}
export function useUpdateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<ModulePayload>) =>
      apiClient<CourseModule>(`/modules/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modules"] }),
  });
}
export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/modules/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modules"] }),
  });
}

// ---- Lessons ----
type LessonPayload = {
  title: string;
  description?: string;
  videoUrl?: string;
  pdfUrl?: string;
  durationSeconds?: number;
  moduleId: string;
  order?: number;
};
export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LessonPayload) => apiClient<LessonSummary>("/lessons", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lessons"] }),
  });
}
export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<LessonPayload>) =>
      apiClient<LessonSummary>(`/lessons/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lessons"] }),
  });
}
export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/lessons/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lessons"] }),
  });
}
