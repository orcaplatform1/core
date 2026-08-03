"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export const COMMUNITY_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"] as const;
export type CommunityTimeframe = (typeof COMMUNITY_TIMEFRAMES)[number];

export const COMMUNITY_ICT_TAGS = ["Order Block", "FVG", "BOS/CHOCH", "Fibonacci"] as const;
export type CommunityIctTag = (typeof COMMUNITY_ICT_TAGS)[number];

export const COMMUNITY_POST_DISCLAIMER =
  "Bu paylaşım yatırım tavsiyesi değildir, yalnızca eğitim amaçlıdır.";

export type PostDirection = "LONG" | "SHORT" | "NEUTRAL";

export type CommunityPostUser = {
  id: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
};

export type CommunityPost = {
  id: string;
  imageUrl: string;
  title: string;
  description: string | null;
  symbol: string;
  timeframe: string;
  direction: PostDirection;
  ictTags: string[];
  createdAt: string;
  user: CommunityPostUser;
  likes: number;
  dislikes: number;
  myReaction: "LIKE" | "DISLIKE" | null;
  commentsCount: number;
};

export type CommunityFeedResponse = {
  posts: CommunityPost[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  viewer: { isAuthenticated: boolean; isEnrolled: boolean };
};

export function useCommunityFeed(opts: { sort: "newest" | "top"; symbol?: string; page: number }) {
  const params = new URLSearchParams({ sort: opts.sort, page: String(opts.page) });
  if (opts.symbol) params.set("symbol", opts.symbol);
  return useQuery({
    queryKey: ["community", "posts", opts.sort, opts.symbol ?? "", opts.page],
    queryFn: () => apiClient<CommunityFeedResponse>(`/community/posts?${params.toString()}`, { auth: false }),
  });
}

async function uploadCommunityPostImage(file: File): Promise<string> {
  const { uploadUrl, key, publicUrl } = await apiClient<{
    uploadUrl: string;
    key: string;
    publicUrl: string | null;
  }>("/community/posts/upload-url", {
    method: "POST",
    body: { fileName: file.name, contentType: file.type, fileSizeBytes: file.size },
  });
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("Görsel yüklenemedi");
  return publicUrl ?? key;
}

export type CreatePostPayload = {
  title: string;
  description?: string;
  symbol: string;
  timeframe: CommunityTimeframe;
  direction: PostDirection;
  ictTags: CommunityIctTag[];
  disclaimerAccepted: boolean;
  file: File;
};

export function useCreateCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePostPayload) => {
      const imageUrl = await uploadCommunityPostImage(payload.file);
      return apiClient<CommunityPost>("/community/posts", {
        method: "POST",
        body: {
          imageUrl,
          title: payload.title,
          description: payload.description,
          symbol: payload.symbol,
          timeframe: payload.timeframe,
          direction: payload.direction,
          ictTags: payload.ictTags,
          disclaimerAccepted: payload.disclaimerAccepted,
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", "posts"] }),
  });
}

export function useReactToCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: "LIKE" | "DISLIKE" }) =>
      apiClient<{ likes: number; dislikes: number }>(`/community/posts/${postId}/react`, {
        method: "POST",
        body: { type },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", "posts"] }),
  });
}

export function useReportCommunityPost() {
  return useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason: string }) =>
      apiClient(`/community/posts/${postId}/report`, { method: "POST", body: { reason } }),
  });
}

export type CommunityComment = {
  id: string;
  text: string;
  createdAt: string;
  user: CommunityPostUser;
};

export function useCommunityComments(postId: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: ["community", "comments", postId, page],
    queryFn: () =>
      apiClient<{ data: CommunityComment[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        `/community/posts/${postId}/comments?page=${page}`,
        { auth: false },
      ),
    enabled,
  });
}

export function useAddCommunityComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      apiClient<CommunityComment>(`/community/posts/${postId}/comments`, { method: "POST", body: { text } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community", "comments", postId] });
      qc.invalidateQueries({ queryKey: ["community", "posts"] });
    },
  });
}

export type CommunityModerationReport = {
  id: string;
  reason: string;
  status: "PENDING" | "RESOLVED";
  createdAt: string;
  reporter: CommunityPostUser;
};

export type CommunityModerationPost = CommunityPost & { reports: CommunityModerationReport[] };

export function useAdminHiddenCommunityPosts() {
  return useQuery({
    queryKey: ["admin", "community", "hidden"],
    queryFn: () => apiClient<CommunityModerationPost[]>("/manage/community/hidden"),
  });
}

export function useRestoreCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/manage/community/${id}/restore`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "community", "hidden"] }),
  });
}

export function useDeleteCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/manage/community/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "community", "hidden"] }),
  });
}
