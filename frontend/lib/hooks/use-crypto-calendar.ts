"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type CryptoCalendarEvent = {
  id: string;
  externalId: string;
  title: string;
  description: string | null;
  coins: string[];
  category: string | null;
  eventDate: string;
  hotScore: number;
  sourceUrl: string | null;
  isMock: boolean;
  createdAt: string;
  updatedAt: string;
};

export function useCryptoCalendarEvents(days = 30) {
  return useQuery({
    queryKey: ["tools", "crypto", "calendar", days],
    queryFn: () => apiClient<CryptoCalendarEvent[]>(`/tools/crypto/calendar?days=${days}`),
    refetchInterval: 30 * 60_000,
  });
}
