"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  periodPoints: number;
  totalPoints: number;
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["points", "leaderboard"],
    queryFn: () => apiClient<LeaderboardEntry[]>("/points/leaderboard"),
  });
}
