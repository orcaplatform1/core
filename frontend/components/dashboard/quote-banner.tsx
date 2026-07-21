"use client";

import { Quote } from "lucide-react";
import { useDailyQuote } from "@/lib/hooks/use-dashboard";

export function QuoteBanner() {
  const { data, isLoading } = useDailyQuote();

  if (isLoading || !data) {
    return <div className="h-20 w-full animate-pulse rounded-2xl bg-card" />;
  }

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-card to-card p-6">
      <div className="flex items-start gap-3">
        <Quote className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">“{data.text}”</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {data.author} · {data.profession}
          </p>
        </div>
      </div>
    </div>
  );
}
