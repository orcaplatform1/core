"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type SuccessStoryStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MySuccessStory = {
  id: string;
  userId: string;
  title: string;
  content: string;
  status: SuccessStoryStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MySuccessStoryStatus = {
  eligible: boolean;
  graduated: boolean;
  quizSuccessRate: number;
  story: MySuccessStory | null;
};

export type PublicSuccessStory = {
  id: string;
  title: string;
  content: string;
  moderatedAt: string | null;
  createdAt: string;
  user: { id: string; fullName: string; avatarUrl: string | null };
};

export type AdminSuccessStory = MySuccessStory & {
  user: { id: string; fullName: string; email: string | null };
};

export function useMySuccessStory() {
  return useQuery({
    queryKey: ["success-stories", "mine"],
    queryFn: () => apiClient<MySuccessStoryStatus>("/success-stories/mine"),
  });
}

export function useSubmitSuccessStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; content: string }) =>
      apiClient<MySuccessStory>("/success-stories", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["success-stories", "mine"] }),
  });
}

export function useDeleteMySuccessStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient("/success-stories/mine", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["success-stories", "mine"] }),
  });
}

export function usePublicSuccessStories() {
  return useQuery({
    queryKey: ["success-stories", "public"],
    queryFn: () => apiClient<PublicSuccessStory[]>("/success-stories", { auth: false }),
  });
}

export function useAdminSuccessStories(status: SuccessStoryStatus) {
  return useQuery({
    queryKey: ["admin", "success-stories", status],
    queryFn: () => apiClient<AdminSuccessStory[]>(`/manage/success-stories?status=${status}`),
  });
}

export function useModerateSuccessStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: "APPROVED" | "REJECTED"; rejectionReason?: string }) =>
      apiClient(`/manage/success-stories/${id}`, { method: "PATCH", body: { status, rejectionReason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "success-stories"] }),
  });
}
