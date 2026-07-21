"use client";

import { BookOpen, Shield, LineChart, Users, Landmark, Crown } from "lucide-react";
import { useCategoryBreakdown } from "@/lib/hooks/use-dashboard";

const rotation = [
  { icon: BookOpen, bg: "#1C2550", fg: "#4F6BFF", bar: "#4F6BFF" },
  { icon: Shield, bg: "#123A36", fg: "#2DD4BF", bar: "#2DD4BF" },
  { icon: LineChart, bg: "#1E2050", fg: "#6366F1", bar: "#6366F1" },
  { icon: Users, bg: "#2A2147", fg: "#8A5CFF", bar: "#8A5CFF" },
  { icon: Landmark, bg: "#332512", fg: "#D9A441", bar: "#D9A441" },
  { icon: Crown, bg: "#3A2717", fg: "#FF8C3A", bar: "#FF8C3A" },
];

export function CategoryProgress() {
  const { data, isLoading } = useCategoryBreakdown();

  if (isLoading) {
    return <div className="h-64 w-full animate-pulse rounded-2xl bg-card" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Henüz kategori bazlı ilerleme verisi yok.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold text-foreground">Ders İlerleme Durumu</h3>
      <div className="mt-5 flex flex-col gap-4">
        {data.map((cat, i) => {
          const style = rotation[i % rotation.length];
          const Icon = style.icon;
          return (
            <div key={cat.categoryId} className="flex items-center gap-3">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: style.bg, color: style.fg }}
              >
                <Icon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium text-foreground">{cat.categoryName}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                    {cat.completedLessons}/{cat.totalLessons} Ders
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ width: `${cat.percentage}%`, backgroundColor: style.bar }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right text-xs font-semibold text-foreground">
                    %{cat.percentage}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
