"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { QuizSummary, QuizForTaking, QuizAttempt } from "@/lib/types/quiz";

export function useAllQuizzes() {
  return useQuery({
    queryKey: ["quizzes"],
    queryFn: () => apiClient<QuizSummary[]>("/quizzes", { auth: false }),
  });
}

export function useQuizForTaking(quizId: string) {
  return useQuery({
    queryKey: ["quizzes", quizId, "take"],
    queryFn: () => apiClient<QuizForTaking>(`/quizzes/${quizId}/take`),
    enabled: !!quizId,
  });
}

export function useStartAttempt() {
  return useMutation({
    mutationFn: (payload: {
      quizId: string;
      lessonId: string;
      moduleId: string;
      programId: string;
    }) =>
      apiClient<QuizAttempt>("/quiz-attempts/start", {
        method: "POST",
        body: { ...payload, answers: [] },
      }),
  });
}

export function useSubmitAnswer() {
  return useMutation({
    mutationFn: (payload: {
      quizAttemptId: string;
      questionId: string;
      selectedAnswerId: string;
      timeSpent?: number;
    }) => apiClient("/quiz-answers", { method: "POST", body: payload }),
  });
}

export function useFinishAttempt() {
  return useMutation({
    mutationFn: (attemptId: string) =>
      apiClient<QuizAttempt>("/quiz-attempts/finish", {
        method: "POST",
        body: { attemptId },
      }),
  });
}
