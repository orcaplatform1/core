"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type DmUser = { id: string; fullName: string; username: string | null; avatarUrl?: string | null; online?: boolean };

export type DmMessageEdit = { previousContent: string; editedAt: string };

export type DmMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  status: "SENT" | "BLOCKED_PROFANITY" | "BLOCKED_RATE_LIMIT" | "BLOCKED_USER_BLOCKED";
  blockedReason: string | null;
  readAt: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  edits: DmMessageEdit[];
};

export type Conversation = {
  partner: DmUser;
  lastMessage: DmMessage & { sender: DmUser; recipient: DmUser };
  unreadCount: number;
};

export function useConversations() {
  return useQuery({
    queryKey: ["dm", "conversations"],
    queryFn: () => apiClient<Conversation[]>("/dm/conversations"),
    refetchInterval: 10000,
  });
}

export function useUnreadDmCount() {
  return useQuery({
    queryKey: ["dm", "unread-count"],
    queryFn: () => apiClient<{ count: number }>("/dm/unread-count"),
    refetchInterval: 15000,
  });
}

export type ThreadResponse = {
  messages: DmMessage[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  isBlockedByMe: boolean;
  hasBlockedMe: boolean;
  otherUserOnline: boolean;
  suspendedMessage: string | null;
};

export function useThread(userId: string, page: number) {
  return useQuery({
    queryKey: ["dm", "thread", userId, page],
    queryFn: () => apiClient<ThreadResponse>(`/dm/${userId}/messages?page=${page}`),
    enabled: !!userId,
    refetchInterval: 5000,
  });
}

export function useSendDm(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => apiClient<DmMessage>(`/dm/${userId}/messages`, { method: "POST", body: { content } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dm", "thread", userId] });
      qc.invalidateQueries({ queryKey: ["dm", "conversations"] });
    },
  });
}

export function useEditDm(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiClient<DmMessage>(`/dm/messages/${id}`, { method: "PATCH", body: { content } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dm", "thread", userId] }),
  });
}

export function useReportDm() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient(`/dm/messages/${id}/report`, { method: "POST", body: { reason } }),
  });
}

export function useDeleteDm(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/dm/messages/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dm", "thread", userId] }),
  });
}

export type AdminDmMessage = DmMessage & { sender: DmUser; recipient: DmUser };

export function useAdminDmLog(page: number) {
  return useQuery({
    queryKey: ["admin", "dm", "log", page],
    queryFn: () =>
      apiClient<{ data: AdminDmMessage[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        `/manage/dm/log?page=${page}`,
      ),
  });
}

export type AdminBlockAction = {
  id: string;
  createdAt: string;
  blocker: DmUser;
  blocked: DmUser;
};

export function useAdminDmBlocks(page: number) {
  return useQuery({
    queryKey: ["admin", "dm", "blocks", page],
    queryFn: () =>
      apiClient<{ data: AdminBlockAction[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        `/manage/dm/blocks?page=${page}`,
      ),
  });
}

export type AdminDmReport = {
  id: string;
  reason: string;
  createdAt: string;
  reporter: DmUser;
  message: { id: string; content: string; createdAt: string; sender: DmUser; recipient: DmUser };
};

export function useAdminDmReports(page: number) {
  return useQuery({
    queryKey: ["admin", "dm", "reports", page],
    queryFn: () =>
      apiClient<{ data: AdminDmReport[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        `/manage/dm/reports?page=${page}`,
      ),
  });
}
