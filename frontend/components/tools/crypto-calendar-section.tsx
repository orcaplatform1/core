"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useCryptoCalendarEvents, type CryptoCalendarEvent } from "@/lib/hooks/use-crypto-calendar";
import { ToolCard } from "./tool-card";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [
  { label: "7g", days: 7 },
  { label: "30g", days: 30 },
  { label: "90g", days: 90 },
] as const;

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function HotScoreBadge({ hotScore }: { hotScore: number }) {
  if (hotScore >= 4) {
    return (
      <span className="rounded-full bg-danger/10 px-2 py-0.5 text-badge text-danger">
        Çok Sıcak
      </span>
    );
  }
  if (hotScore >= 2) {
    return (
      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-badge text-warning">
        Sıcak
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-badge text-muted-foreground">
      Normal
    </span>
  );
}

function EventCard({ event }: { event: CryptoCalendarEvent }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg card-inner p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-badge text-primary">
            {formatEventDate(event.eventDate)}
          </span>
          <p className="text-card-title-sm text-foreground">{event.title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {event.isMock && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-badge text-muted-foreground">
              Örnek Veri
            </span>
          )}
          <HotScoreBadge hotScore={event.hotScore} />
        </div>
      </div>
      {event.description && (
        <p className="line-clamp-2 text-body-xs text-muted-foreground">{event.description}</p>
      )}
      {event.coins.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {event.coins.map((coin) => (
            <span
              key={coin}
              className="rounded-full bg-card-hover px-2 py-0.5 text-badge text-foreground/80"
            >
              {coin}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function CryptoCalendarSection() {
  const [days, setDays] = useState<number>(30);
  const { data } = useCryptoCalendarEvents(days);

  const events = useMemo(() => {
    if (!data) return [];
    return [...data].sort(
      (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
    );
  }, [data]);

  return (
    <ToolCard title="Kripto Takvimi" icon={CalendarDays} accent="primary">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            type="button"
            onClick={() => setDays(opt.days)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-body-xs transition-colors duration-200",
              days === opt.days
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:bg-card-hover hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {events.length === 0 && (
          <p className="py-6 text-center text-body-sm text-muted-foreground">
            Bu tarih aralığında etkinlik bulunmuyor.
          </p>
        )}
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </ToolCard>
  );
}
