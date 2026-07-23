"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { NextLiveLesson } from "@/lib/types/curriculum";

export function useNextLiveLesson() {
  return useQuery({
    queryKey: ["live-lessons", "next"],
    queryFn: () => apiClient<NextLiveLesson>("/live-lessons/next"),
    refetchInterval: 30000,
  });
}
