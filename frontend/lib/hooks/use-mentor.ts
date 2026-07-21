"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import type { MentorMessage, MentorQuota, DiscussedLesson } from "@/lib/types/curriculum";

export function useMentorHistory(lessonId?: string) {
  return useQuery({
    queryKey: ["mentor", "history", lessonId ?? "all"],
    queryFn: () =>
      apiClient<MentorMessage[]>(
        lessonId ? `/mentor/history?lessonId=${lessonId}` : "/mentor/history"
      ),
  });
}

export function useMentorQuota() {
  return useQuery({
    queryKey: ["mentor", "quota"],
    queryFn: () => apiClient<MentorQuota>("/mentor/quota"),
  });
}

export function useDiscussedLessons() {
  return useQuery({
    queryKey: ["mentor", "lessons"],
    queryFn: () => apiClient<DiscussedLesson[]>("/mentor/lessons"),
  });
}

export function useSendMentorMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { content: string; lessonId?: string; imageUrl?: string }) =>
      apiClient<{ message: MentorMessage; quotaSource: string }>("/mentor/message", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "history"] });
      queryClient.invalidateQueries({ queryKey: ["mentor", "quota"] });
    },
  });
}

export { ApiError };
