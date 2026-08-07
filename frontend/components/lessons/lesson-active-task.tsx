"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLessonTask, useSetMyTaskProgress } from "@/lib/hooks/use-curriculum";

// Ic icerik olarak tasarlandi - kart cercevesi/basligi bu bileseni kullanan yerde saglanir.
export function LessonActiveTask({ lessonId }: { lessonId: string }) {
  const { data, isLoading } = useLessonTask(lessonId);
  const { mutate: setProgress, isPending } = useSetMyTaskProgress(lessonId);

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg bg-card-inner" />;
  }

  if (!data?.task) {
    return <p className="text-body-sm text-muted-foreground">Bu derse tanımlı bir görev yok.</p>;
  }

  const { task, myProgress } = data;
  const completedCount = myProgress?.completedCount ?? 0;
  const completed = myProgress?.completed ?? false;
  const percent = Math.min(100, Math.round((completedCount / task.targetCount) * 100));

  return (
    <div>
      <p className="text-body-sm font-medium text-foreground">{task.title}</p>
      <p className="mt-1 text-body-xs text-muted-foreground">{task.description}</p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            completed ? "bg-success" : "bg-primary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={`flex items-center gap-1 text-body-xs font-semibold ${
            completed ? "text-success" : "text-muted-foreground"
          }`}
        >
          {completed && <CheckCircle2 className="size-3.5" />}
          {completedCount}/{task.targetCount} Tamamlandı
        </span>
        {!completed && (
          <Button className="h-8 px-3 text-xs" disabled={isPending} onClick={() => setProgress(completedCount + 1)}>
            İşaretle
          </Button>
        )}
      </div>
    </div>
  );
}
