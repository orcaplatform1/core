"use client";
import { useEffect, useState } from "react";
import { Radio, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNextLiveLesson } from "@/lib/hooks/use-live-lessons";

function formatCountdown(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}g ${pad(hours)}s ${pad(minutes)}d ${pad(seconds)}sn`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function LiveLessonsPage() {
  const { data: lesson, isLoading } = useNextLiveLesson();
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (lesson?.isLive === false) {
      setSecondsLeft(lesson.startsInSeconds);
    }
  }, [lesson?.id, lesson?.startsInSeconds, lesson?.isLive]);

  useEffect(() => {
    if (!lesson || lesson.isLive) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lesson]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#F5F8FF]">Canlı Dersler</h1>
        <p className="text-sm text-[#8D9BB6]">
          Canlı dersler Discord üzerinden yapılır. Ders başladığında aşağıdaki buton aktif olur.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>
        </div>
      ) : !lesson ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-[#8D9BB6]">Şu anda planlanmış bir canlı ders yok.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            {lesson.isLive ? (
              <span className="flex items-center gap-1 rounded-full bg-[#FF5C5C22] px-3 py-1 text-xs font-medium text-[#FF5C5C]">
                <Radio size={12} className="animate-pulse" />
                CANLI
              </span>
            ) : (
              <span className="rounded-full bg-card-inner px-3 py-1 text-xs text-[#8D9BB6]">
                Yaklaşan Ders
              </span>
            )}
          </div>

          <h2 className="text-xl font-semibold text-[#F5F8FF]">{lesson.title}</h2>

          <div className="flex flex-wrap gap-4 text-sm text-[#8D9BB6]">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              {new Date(lesson.scheduledAt).toLocaleString("tr-TR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} />
              {lesson.durationMinutes} dakika
            </div>
          </div>

          {!lesson.isLive && (
            <div className="rounded-xl border border-border bg-card-inner p-4 text-center">
              <p className="mb-1 text-xs text-[#8D9BB6]">Başlamasına kalan süre</p>
              <p className="text-2xl font-semibold text-[#F5F8FF] tabular-nums">
                {formatCountdown(secondsLeft)}
              </p>
            </div>
          )}

          <Button
            disabled={!lesson.isLive}
            className="w-full"
            onClick={() => {
              if (lesson.discordLink) {
                window.open(lesson.discordLink, "_blank");
              }
            }}
          >
            {lesson.isLive ? "Derse Katıl (Discord)" : "Ders Henüz Başlamadı"}
          </Button>
        </div>
      )}
    </div>
  );
}
