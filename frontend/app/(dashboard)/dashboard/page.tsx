"use client";

import { GraduationCap, Trophy, LineChart, TrendingUp, Repeat, Lock } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useMyStats, useBacktestChart, useSimulationChart } from "@/lib/hooks/use-dashboard";
import { StatCard } from "@/components/dashboard/stat-card";
import { QuoteBanner } from "@/components/dashboard/quote-banner";
import { AiAnalysisWidget } from "@/components/dashboard/ai-analysis-widget";
import { CategoryProgress } from "@/components/dashboard/category-progress";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { RecentLessonCard } from "@/components/dashboard/recent-lesson-card";
import { BadgesWidget } from "@/components/dashboard/badges-widget";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useMyStats();
  const { data: backtestChart, isLoading: loadingBacktest } = useBacktestChart();
  const { data: simChart, isLoading: loadingSim } = useSimulationChart();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Merhaba, {user?.fullName?.split(" ")[0] ?? "Trader"} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bugün de finansal yolculuğuna kaldığın yerden devam et.
        </p>
      </div>

      <QuoteBanner />

      {isLoading || !stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : stats.locked ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <Lock className="mx-auto size-8 text-primary" />
          <p className="mx-auto mt-4 max-w-md text-sm text-foreground">
            {stats.unlockMessage}
          </p>
          <Button className="mt-5 h-11" render={<Link href="/programs">Programları İncele</Link>} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label="Genel Finans Skoru"
              value={stats.overallScore}
              icon={Trophy}
              accent="primary"
              trend={
                stats.previousWeekScore !== null
                  ? {
                      direction:
                        stats.overallScore > stats.previousWeekScore
                          ? "up"
                          : stats.overallScore < stats.previousWeekScore
                            ? "down"
                            : "flat",
                      label: `Geçen hafta: ${stats.previousWeekScore}`,
                    }
                  : undefined
              }
            />
            <StatCard
              label="Eğitim Tamamlama"
              value={`%${stats.educationCompletionRate}`}
              icon={GraduationCap}
              accent="success"
            />
            <StatCard
              label="Quiz Başarı Oranı"
              value={`%${stats.quizSuccessRate}`}
              icon={LineChart}
              accent="warning"
            />
            <StatCard
              label="Backtest Başarı Oranı"
              value={`%${stats.backtestSuccessRate}`}
              icon={TrendingUp}
              accent="purple"
            />
            <StatCard
              label="Simülasyon Performansı"
              value={`${stats.simulationReturnRate >= 0 ? "+" : ""}%${stats.simulationReturnRate}`}
              icon={Repeat}
              accent={stats.simulationReturnRate >= 0 ? "success" : "warning"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <AiAnalysisWidget />
            <CategoryProgress />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PerformanceChart
              title="Backtest Performansın"
              totalLabel="Toplam PnL"
              data={backtestChart}
              isLoading={loadingBacktest}
              color="#8A5CFF"
            />
            <PerformanceChart
              title="Simülasyon Performansın"
              totalLabel="Toplam PnL"
              data={simChart}
              isLoading={loadingSim}
              color="#35D07F"
            />
          </div>

          <RecentLessonCard />

          <BadgesWidget />
        </>
      )}
    </div>
  );
}
