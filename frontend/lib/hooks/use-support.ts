"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type SupportTicketCategory = "PAYMENT" | "TECHNICAL" | "ACCOUNT" | "OTHER";
export type SupportTicketStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export type SupportUser = {
  id: string;
  fullName: string;
  username: string | null;
  avatarUrl?: string | null;
  role: "GUEST" | "STUDENT" | "STAFF" | "SUPER_ADMIN";
};

export type SupportTicket = {
  id: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  user: SupportUser;
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: SupportUser;
};

type PaginatedTickets = {
  data: SupportTicket[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export function useMyTickets(page: number) {
  return useQuery({
    queryKey: ["support", "mine", page],
    queryFn: () => apiClient<PaginatedTickets>(`/support/tickets?page=${page}`),
    refetchInterval: 15000,
  });
}

export function useTicket(id: string | null) {
  return useQuery({
    queryKey: ["support", "ticket", id],
    queryFn: () => apiClient<{ ticket: SupportTicket; messages: SupportMessage[] }>(`/support/tickets/${id}`),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { subject: string; category: SupportTicketCategory; message: string }) =>
      apiClient<SupportTicket>("/support/tickets", { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support", "mine"] });
    },
  });
}

export function useReplyTicket(ticketId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiClient<SupportMessage>(`/support/tickets/${ticketId}/messages`, { method: "POST", body: { content } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support", "ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["support", "mine"] });
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
    },
  });
}

// --- Admin ---

export function useAdminTickets(page: number, status: string, category: string) {
  return useQuery({
    queryKey: ["admin", "support", "list", page, status, category],
    queryFn: () =>
      apiClient<PaginatedTickets>(
        `/manage/support?page=${page}${status ? `&status=${status}` : ""}${category ? `&category=${category}` : ""}`,
      ),
    refetchInterval: 15000,
  });
}

export function useUpdateTicketStatus(ticketId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: SupportTicketStatus) =>
      apiClient(`/manage/support/${ticketId}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support", "ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
    },
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/manage/support/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
    },
  });
}
