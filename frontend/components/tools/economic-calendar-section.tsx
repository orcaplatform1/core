"use client";

import { useState } from "react";
import { Landmark, CalendarClock, Clock3 } from "lucide-react";
import { useEconomicIndicators } from "@/lib/hooks/use-tools";
import { ToolCard, type ToolAccent } from "./tool-card";

function IndicatorWidget({
  label,
  value,
  unit,
  change,
  date,
}: {
  label: string;
  value: number;
  unit: string;
  change: number | null;
  date: string;
}) {
  const accent: ToolAccent = change == null ? "primary" : change >= 0 ? "success" : "danger";
  const tint =
    accent === "success" ? "bg-success/[0.04]" : accent === "danger" ? "bg-danger/[0.04]" : "bg-primary/[0.03]";
  return (
    <ToolCard title={label} icon={Landmark} accent={accent} className={tint}>
      <p className="text-num-md text-foreground">
        {value.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
        <span className="text-body-xs text-muted-foreground">{unit}</span>
      </p>
      {change != null && (
        <p className={`mt-1.5 text-financial ${change >= 0 ? "text-success" : "text-danger"}`}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)} (önceki döneme göre)
        </p>
      )}
      <p className="mt-1.5 text-body-xs text-muted-foreground">{date}</p>
    </ToolCard>
  );
}

export function EconomicCalendarSection() {
  const { data } = useEconomicIndicators();
  const indicators = data?.indicators ?? [];
  const meetings = data?.upcomingFomcMeetings ?? [];
  const [nearestMeeting, ...otherMeetings] = meetings;

  // Lazy initializer: React tek seferliğine, ilk render'da çalıştırır — her
  // render'da Date.now() çağırıp kararsız sonuç üretmesini engeller.
  const [now] = useState(() => Date.now());
  const daysUntilNearest = nearestMeeting
    ? Math.max(0, Math.ceil((new Date(nearestMeeting.date).getTime() - now) / 86400000))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-body-xs text-muted-foreground">
          ABD Ekonomik Göstergeleri — Kaynak: FRED (Federal Reserve Economic Data). Şu an yalnızca ABD verisi
          sunuluyor — çok ülkeli, ileri tarihli ve güvenilir ücretsiz bir ekonomik takvim API&apos;si bulunmuyor;
          daha geniş kapsam için ileride ücretli bir sağlayıcıya geçiş gerekecek.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {indicators.length === 0 && (
            <p className="text-body-xs text-muted-foreground">
              Gösterge verisi henüz yok (FRED API anahtarı yapılandırılana kadar bu alan boş kalır).
            </p>
          )}
          {indicators.map((ind) => (
            <IndicatorWidget
              key={ind.id}
              label={ind.label}
              value={ind.latestValue}
              unit={ind.unit}
              change={ind.previousValue != null ? ind.latestValue - ind.previousValue : null}
              date={ind.latestDate}
            />
          ))}
        </div>
      </div>

      <ToolCard title="Yaklaşan FOMC Toplantıları" icon={CalendarClock} accent="primary">
        <div className="space-y-2">
          {nearestMeeting && (
            <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/10 px-4 py-3">
              <div>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-badge text-primary">
                  BİR SONRAKİ TOPLANTI
                </span>
                <p className="mt-1.5 text-card-title-sm text-foreground">{nearestMeeting.label}</p>
              </div>
              <div className="text-right">
                <p className="flex items-center gap-1 text-financial text-primary">
                  <Clock3 className="size-3.5" />
                  {daysUntilNearest != null ? `${daysUntilNearest} gün` : "—"}
                </p>
                <p className="text-body-xs text-muted-foreground">{nearestMeeting.date}</p>
              </div>
            </div>
          )}
          {otherMeetings.map((m) => (
            <div
              key={m.date}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-body-xs transition-colors hover:bg-card-hover"
            >
              <span className="text-foreground/90">{m.label}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-badge text-muted-foreground">
                {m.date}
              </span>
            </div>
          ))}
        </div>
      </ToolCard>
    </div>
  );
}
