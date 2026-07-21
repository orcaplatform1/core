"use client";

import Link from "next/link";
import { TrendingUp, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { useCategoryBreakdown } from "@/lib/hooks/use-dashboard";
import { Button } from "@/components/ui/button";

export function AiAnalysisWidget() {
  const { data, isLoading } = useCategoryBreakdown();

  if (isLoading) {
    return <div className="h-72 w-full animate-pulse rounded-2xl bg-card" />;
  }

  if (!data || data.length === 0) return null;

  const sorted = [...data].sort((a, b) => b.percentage - a.percentage);
  const strengths = sorted.filter((c) => c.percentage >= 70).slice(0, 5);
  const weaknesses = sorted
    .filter((c) => c.percentage < 70)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 5);
  const weakest = weaknesses[0];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <TrendingUp className="size-4 text-primary" /> AI Analiz: Güçlü ve Geliştirmen Gereken Alanlar
        </h3>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-success">
            <CheckCircle2 className="size-3.5" /> Güçlü Yönlerin
          </p>
          <div className="flex flex-col gap-2.5">
            {strengths.length === 0 && (
              <p className="text-xs text-muted-foreground">Henüz güçlü bir alan tespit edilmedi.</p>
            )}
            {strengths.map((c) => (
              <div key={c.categoryId} className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                <span className="flex-1 truncate text-xs text-foreground">{c.categoryName}</span>
                <div className="h-1.5 w-16 rounded-full bg-secondary">
                  <div className="h-1.5 rounded-full bg-success" style={{ width: `${c.percentage}%` }} />
                </div>
                <span className="w-8 text-right text-xs font-semibold text-success">%{c.percentage}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-danger">
            <XCircle className="size-3.5" /> Geliştirmen Gereken Alanlar
          </p>
          <div className="flex flex-col gap-2.5">
            {weaknesses.length === 0 && (
              <p className="text-xs text-muted-foreground">Harika, zayıf alan görünmüyor!</p>
            )}
            {weaknesses.map((c) => (
              <div key={c.categoryId} className="flex items-center gap-2">
                <XCircle className="size-3.5 shrink-0 text-danger" />
                <span className="flex-1 truncate text-xs text-foreground">{c.categoryName}</span>
                <div className="h-1.5 w-16 rounded-full bg-secondary">
                  <div className="h-1.5 rounded-full bg-danger" style={{ width: `${c.percentage}%` }} />
                </div>
                <span className="w-8 text-right text-xs font-semibold text-danger">%{c.percentage}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {weakest && (
        <div className="ai-suggestion-box mt-5 flex flex-col items-start justify-between gap-3 rounded-xl p-4 sm:flex-row sm:items-center">
          <p className="flex items-start gap-2 text-xs text-foreground">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-purple" />
            <span>
              <strong className="text-purple">AI Önerisi:</strong> {weakest.categoryName} konusuna
              odaklanman finans skorunu yükseltecek.
            </span>
          </p>
          <Button size="sm" className="btn-ai-mentor h-8 shrink-0" render={<Link href="/mentor">AI Mentor ile Görüş</Link>} />
        </div>
      )}
    </div>
  );
}
