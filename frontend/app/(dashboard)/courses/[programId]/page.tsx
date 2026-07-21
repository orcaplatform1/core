"use client";

import { use } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import {
  useProgram,
  useAllModules,
  useAllLessons,
  useMyProgress,
} from "@/lib/hooks/use-curriculum";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = use(params);
  const { data: program } = useProgram(programId);
  const { data: allModules, isLoading: loadingModules } = useAllModules();
  const { data: allLessons, isLoading: loadingLessons } = useAllLessons();
  const { data: progress } = useMyProgress();

  const modules = (allModules ?? [])
    .filter((m) => m.programId === programId)
    .sort((a, b) => a.order - b.order);

  const isCompleted = (lessonId: string) =>
    progress?.some((p) => p.lessonId === lessonId && p.completed) ?? false;

  const isLoading = loadingModules || loadingLessons;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{program?.title ?? "Yükleniyor..."}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Modülleri sırayla tamamlayarak sertifikaya bir adım daha yaklaş.
        </p>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-card" />
      ) : (
        <Accordion multiple={false} defaultValue={modules[0] ? [modules[0].id] : []} className="flex flex-col gap-3">
          {modules.map((mod, i) => {
            const lessons = (allLessons ?? [])
              .filter((l) => l.moduleId === mod.id)
              .sort((a, b) => a.order - b.order);

            return (
              <AccordionItem
                key={mod.id}
                value={mod.id}
                className="rounded-2xl border border-border bg-card px-5"
              >
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{mod.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-1 pb-2 pl-11">
                    {lessons.length === 0 && (
                      <p className="text-xs text-muted-foreground">Bu modülde henüz ders yok.</p>
                    )}
                    {lessons.map((lesson) => {
                      const done = isCompleted(lesson.id);
                      return (
                        <Link
                          key={lesson.id}
                          href={`/courses/${programId}/lessons/${lesson.id}`}
                          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors duration-200 hover:bg-accent"
                        >
                          {done ? (
                            <CheckCircle2 className="size-4 shrink-0 text-success" />
                          ) : (
                            <Circle className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <PlayCircle className="size-4 shrink-0 text-muted-foreground" />
                          <span className="text-foreground">{lesson.title}</span>
                          {lesson.durationSeconds && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {Math.round(lesson.durationSeconds / 60)} dk
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
