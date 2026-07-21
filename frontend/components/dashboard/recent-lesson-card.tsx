"use client";

import Link from "next/link";
import { PlayCircle, Sparkles } from "lucide-react";
import { useTodayRecommendations } from "@/lib/hooks/use-dashboard";

export function RecentLessonCard() {
  const { data, isLoading } = useTodayRecommendations();

  if (isLoading) {
    return <div className="h-40 w-full animate-pulse rounded-2xl bg-card" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Şu an için önerilen bir ders yok — bir programa kayıtlı değilsin.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-purple" />
        <h3 className="text-sm font-semibold text-foreground">AI Önerisi — Kaldığın Yerden</h3>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {data.map((rec) => (
          <Link
            key={rec.lessonId}
            href={`/courses/${rec.programId}/lessons/${rec.lessonId}`}
            className="card-inner flex items-center gap-3 rounded-xl p-3 transition-colors duration-200 hover:bg-[var(--card-hover)]"
          >
            <PlayCircle className="size-8 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{rec.lessonTitle}</p>
              <p className="truncate text-xs text-muted-foreground">
                {rec.moduleTitle}
                {rec.estimatedMinutes ? ` · ${rec.estimatedMinutes} dk` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
