"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type CommentUser = {
  id: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: "GUEST" | "STUDENT" | "STAFF" | "SUPER_ADMIN";
};

export type CommentEdit = { previousContent: string; editedAt: string };

export type CommentRow = {
  id: string;
  content: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  user: CommentUser;
  likes: number;
  dislikes: number;
  score: number;
  edits: CommentEdit[];
  replies: CommentRow[];
};

export type CommentsResponse = {
  pinned: CommentRow[];
  comments: CommentRow[];
  myPending: CommentRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  suspendedMessage: string | null;
};

export function useLessonComments(lessonId: string, page: number) {
  return useQuery({
    queryKey: ["comments", lessonId, page],
    queryFn: () => apiClient<CommentsResponse>(`/lessons/${lessonId}/comments?page=${page}`),
    enabled: !!lessonId,
  });
}

export function useCreateComment(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { content: string; parentId?: string }) =>
      apiClient<CommentRow>(`/lessons/${lessonId}/comments`, { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", lessonId] }),
  });
}

export function useEditComment(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiClient<CommentRow>(`/comments/${id}`, { method: "PATCH", body: { content } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", lessonId] }),
  });
}

export function useReactToComment(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, type }: { commentId: string; type: "LIKE" | "DISLIKE" }) =>
      apiClient<{ likes: number; dislikes: number }>(`/comments/${commentId}/react`, {
        method: "POST",
        body: { type },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", lessonId] }),
  });
}

export function useDeleteComment(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => apiClient(`/comments/${commentId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", lessonId] }),
  });
}

export type AdminCommentRow = CommentRow & {
  lesson: { id: string; title: string; module: { title: string; program: { title: string } } };
};

export function useAdminComments(status: "PENDING" | "APPROVED" | "REJECTED") {
  return useQuery({
    queryKey: ["admin", "comments", status],
    queryFn: () => apiClient<AdminCommentRow[]>(`/manage/comments?status=${status}`),
  });
}

export function useModerateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      apiClient(`/manage/comments/${id}`, { method: "PATCH", body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "comments"] }),
  });
}

export function useAdminDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/comments/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "comments"] }),
  });
}

export function useReportComment() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient(`/comments/${id}/report`, { method: "POST", body: { reason } }),
  });
}

export type AdminCommentReport = {
  id: string;
  reason: string;
  createdAt: string;
  reporter: { id: string; fullName: string; username: string | null };
  comment: {
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; fullName: string; username: string | null };
    lesson: { id: string; title: string };
  };
};

export function useAdminCommentReports(page: number) {
  return useQuery({
    queryKey: ["admin", "comments", "reports", page],
    queryFn: () =>
      apiClient<{ data: AdminCommentReport[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        `/manage/comments/reports?page=${page}`,
      ),
  });
}
