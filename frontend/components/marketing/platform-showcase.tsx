import Link from "next/link";
import { ArrowRight, Bot, GraduationCap, LayoutDashboard, LineChart, Quote, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveIcon } from "@/lib/marketing/icon-registry";
import type { PlatformShowcaseData } from "@/lib/marketing/site-content-types";

const MOCK_SIDEBAR_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "AI Mentor", icon: Bot },
  { label: "Programlarım", icon: GraduationCap },
  { label: "Backtest", icon: LineChart },
  { label: "Simülasyon", icon: Repeat },
];

function MiniSparkline({ positive = true }: { positive?: boolean }) {
  const points = positive
    ? "0,32 12,28 24,30 36,20 48,22 60,12 72,16 84,6 96,10"
    : "0,10 12,16 24,12 36,20 48,18 60,26 72,22 84,30 96,28";
  return (
    <svg viewBox="0 0 96 36" className="h-8 w-full sm:h-10" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="var(--success)"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function PlatformShowcase({ data }: { data: PlatformShowcaseData }) {
  const {
    eyebrow,
    title,
    description,
    ctaLabel,
    ctaHref,
    greetingName,
    quoteText,
    quoteAuthor,
    stats,
    chartOneLabel,
    chartOneValue,
    chartTwoLabel,
    chartTwoValue,
    streakDays,
    mentorUsageDays,
    activeProgramName,
    upcomingLessonTitle,
    upcomingLessonTime,
  } = data;

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-[0.85fr_1.15fr]">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-primary">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">{title}</h2>
          <p className="mt-4 text-muted-foreground">{description}</p>
          <Button
            variant="gradient"
            size="lg"
            className="mt-7"
            render={
              <Link href={ctaHref}>
                {ctaLabel} <ArrowRight className="size-4" />
              </Link>
            }
          />
        </div>

        {/* Laptop çerçevesi içinde dashboard mockup'ı */}
        <div className="mx-auto w-full max-w-[640px]">
          <div className="rounded-t-xl border-[6px] border-b-0 border-[#1a2035] bg-[#05070f] p-1.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] sm:rounded-t-2xl sm:border-[10px] sm:p-2">
            <div className="aspect-[16/10] overflow-hidden rounded-md bg-[#070b16] sm:rounded-lg">
              <div className="flex h-full text-[6.5px] sm:text-[8px]">
                <div className="hidden w-[22%] shrink-0 flex-col gap-1 border-r border-white/5 bg-black/20 p-2 sm:flex">
                  <div className="mb-2 flex items-center gap-1 font-bold text-foreground">
                    <span className="flex size-3 items-center justify-center rounded-full bg-primary/30 text-primary">
                      O
                    </span>
                    ORCA
                  </div>
                  {MOCK_SIDEBAR_ITEMS.map((item) => (
                    <div
                      key={item.label}
                      className={
                        item.active
                          ? "flex items-center gap-1 rounded bg-primary/15 px-1.5 py-1 text-primary"
                          : "flex items-center gap-1 px-1.5 py-1 text-muted-foreground"
                      }
                    >
                      <item.icon className="size-2.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex-1 space-y-1.5 overflow-hidden p-2 sm:space-y-2 sm:p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">Merhaba, {greetingName} 👋</p>
                      <p className="text-muted-foreground">Bugün piyasalar seni bekliyor.</p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-primary sm:flex">
                      <Quote className="size-2.5 shrink-0" />
                      <span className="truncate">
                        &quot;{quoteText}&quot; — {quoteAuthor}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                    {stats.map((stat) => {
                      const Icon = resolveIcon(stat.icon);
                      return (
                        <div key={stat.label} className="rounded bg-white/[0.04] p-1 sm:rounded-md sm:p-1.5">
                          <Icon className="size-2.5 text-primary" />
                          <p className="mt-1 font-bold text-foreground">{stat.value}</p>
                          <p className="truncate text-muted-foreground">{stat.label}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                    <div className="rounded bg-white/[0.04] p-1.5 sm:rounded-md sm:p-2">
                      <p className="text-muted-foreground">{chartOneLabel}</p>
                      <p className="font-bold text-success">{chartOneValue}</p>
                      <MiniSparkline positive />
                    </div>
                    <div className="rounded bg-white/[0.04] p-1.5 sm:rounded-md sm:p-2">
                      <p className="text-muted-foreground">{chartTwoLabel}</p>
                      <p className="font-bold text-success">{chartTwoValue}</p>
                      <MiniSparkline positive />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 sm:gap-1.5">
                    <div className="rounded bg-white/[0.04] p-1.5 sm:rounded-md">
                      <p className="text-muted-foreground">Günlük Çalışma Serisi</p>
                      <p className="font-bold text-foreground">{streakDays} gün</p>
                    </div>
                    <div className="rounded bg-white/[0.04] p-1.5 sm:rounded-md">
                      <p className="text-muted-foreground">AI Mentor Kullanımı</p>
                      <p className="font-bold text-foreground">{mentorUsageDays} gün</p>
                    </div>
                    <div className="rounded bg-white/[0.04] p-1.5 sm:rounded-md">
                      <p className="text-muted-foreground">Aktif Program</p>
                      <p className="truncate font-bold text-foreground">{activeProgramName}</p>
                    </div>
                    <div className="rounded bg-primary/10 p-1.5 sm:rounded-md">
                      <p className="text-muted-foreground">Yaklaşan Canlı Ders</p>
                      <p className="truncate font-bold text-foreground">{upcomingLessonTitle}</p>
                      <p className="text-primary">{upcomingLessonTime}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-3 rounded-b-lg bg-gradient-to-b from-[#1a2035] to-[#0d111f] sm:h-4 sm:rounded-b-xl">
            <div className="absolute left-1/2 top-0 h-1 w-16 -translate-x-1/2 rounded-b-md bg-[#05070f] sm:w-24" />
          </div>
        </div>
      </div>
    </section>
  );
}
