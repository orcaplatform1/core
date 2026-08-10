"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { QuizSummary } from "@/lib/types/quiz";

export type AdminQuestion = {
  id: string;
  title: string;
  description: string | null;
  explanation: string | null;
  quizId: string;
};

export type AdminAnswer = {
  id: string;
  text: string;
  isCorrect: boolean;
  questionId: string;
};

function invalidateQuizzes(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["quizzes"] });
}
function invalidateQuestions(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-questions"] });
}
function invalidateAnswers(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-answers"] });
}

// ---- Quizzes ----
type QuizPayload = { title: string; description?: string; timeLimitMinutes?: number; lessonId: string };
export function useCreateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuizPayload) => apiClient<QuizSummary>("/quizzes", { method: "POST", body: payload }),
    onSuccess: () => invalidateQuizzes(qc),
  });
}
export function useUpdateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<QuizPayload>) =>
      apiClient<QuizSummary>(`/quizzes/${id}`, { method: "PATCH", body }),
    onSuccess: () => invalidateQuizzes(qc),
  });
}
export function useDeleteQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/quizzes/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateQuizzes(qc),
  });
}

// ---- Questions (admin, requires SUPER_ADMIN) ----
export function useAllQuestions() {
  return useQuery({
    queryKey: ["admin-questions"],
    queryFn: () => apiClient<AdminQuestion[]>("/questions"),
  });
}
type QuestionPayload = { title: string; description?: string; explanation?: string; quizId: string };
export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuestionPayload) =>
      apiClient<AdminQuestion>("/questions", { method: "POST", body: payload }),
    onSuccess: () => invalidateQuestions(qc),
  });
}
export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<QuestionPayload>) =>
      apiClient<AdminQuestion>(`/questions/${id}`, { method: "PATCH", body }),
    onSuccess: () => invalidateQuestions(qc),
  });
}
export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/questions/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateQuestions(qc),
  });
}

// ---- Answers (admin, requires SUPER_ADMIN) ----
export function useAllAnswers() {
  return useQuery({
    queryKey: ["admin-answers"],
    queryFn: () => apiClient<AdminAnswer[]>("/answers"),
  });
}
type AnswerPayload = { text: string; isCorrect?: boolean; questionId: string };
export function useCreateAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AnswerPayload) => apiClient<AdminAnswer>("/answers", { method: "POST", body: payload }),
    onSuccess: () => invalidateAnswers(qc),
  });
}
export function useUpdateAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<AnswerPayload>) =>
      apiClient<AdminAnswer>(`/answers/${id}`, { method: "PATCH", body }),
    onSuccess: () => invalidateAnswers(qc),
  });
}
export function useDeleteAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/answers/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateAnswers(qc),
  });
}
