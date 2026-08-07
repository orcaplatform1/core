"use client";

import { use, useState } from "react";
import {
  Download,
  Clapperboard,
  CheckCircle2,
  Circle,
  PlayCircle,
  ChevronLeft,
  ListChecks,
  ClipboardList,
  NotebookPen,
  BookOpen,
} from "lucide-react";
import { ExternalLink } from "@/components/ui/external-link";
import { ErrorCard } from "@/components/errors/error-card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLesson, useMyProgress, useAllModules, useAllLessons, useProgram } from "@/lib/hooks/use-curriculum";
import { useAllQuizzes } from "@/lib/hooks/use-quiz";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LessonVideoPlayer } from "@/components/lessons/lesson-video-player";
import { LockedLessonBanner } from "@/components/lessons/locked-lesson-banner";
import { CommentSection } from "@/components/lessons/comment-section";
import { LessonNotesPanel } from "@/components/lessons/lesson-notes-panel";
import { LessonActiveTask } from "@/components/lessons/lesson-active-task";
import { AiMentorSidebar } from "@/components/lessons/ai-mentor-sidebar";

export default function LessonPage({
  params,
}: {
  params: Promise<{ programId: string; lessonId: string }>;
}) {
  const { programId, lessonId } = use(params);
  const { data: lesson, isLoading, error } = useLesson(lessonId);
  const { data: program } = useProgram(programId);
  const { data: myProgress } = useMyProgress();
  const { data: allQuizzes } = useAllQuizzes();
  const { data: allModules } = useAllModules();
  const { data: allLessons } = useAllLessons();
  const [activeTab, setActiveTab] = useState("content");
  const lessonQuizzes = (allQuizzes ?? []).filter((q) => q.lessonId === lessonId);

  const isCompleted = (id: string) => myProgress?.some((p) => p.lessonId === id && p.completed) ?? false;

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-card" />;
  }

  if (error || !lesson) {
    return (
      <ErrorCard
        code="404"
        description="Bu ders bulunamadı."
        redirectTo={`/programs/${programId}`}
      />
    );
  }

  const programModules = (allModules ?? [])
    .filter((m) => m.programId === programId)
    .sort((a, b) => a.order - b.order);
  const moduleIndex = programModules.findIndex((m) => m.id === lesson.module.id);
  const moduleLessons = (allLessons ?? [])
    .filter((l) => l.moduleId === lesson.module.id)
    .sort((a, b) => a.order - b.order);
  const completedInModule = moduleLessons.filter((l) => isCompleted(l.id)).length;
  const moduleProgressPercent =
    moduleLessons.length > 0 ? Math.round((completedInModule / moduleLessons.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Ust bilgi seridi: program + modul ilerlemesi + not kisayollari */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-body-sm font-semibold text-foreground">{program?.title ?? "…"}</p>
          <p className="truncate text-body-xs text-muted-foreground">
            {moduleIndex >= 0 ? `Modül ${moduleIndex + 1}: ` : ""}
            {lesson.module.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-body-xs text-muted-foreground">Modül İlerlemesi</span>
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted sm:w-36">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${moduleProgressPercent}%` }}
              />
            </div>
            <span className="shrink-0 text-body-xs font-semibold text-foreground">%{moduleProgressPercent}</span>
          </div>
          {!lesson.locked && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
                onClick={() => setActiveTab("notes")}
              >
                <NotebookPen className="mr-1 size-3.5" /> Not Ekle
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
                onClick={() => setActiveTab("notes")}
              >
                <BookOpen className="mr-1 size-3.5" /> Ders Notları
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-body-sm">
            <Link
              href={`/courses/${programId}`}
              className="flex shrink-0 items-center gap-1 font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" /> Derse Geri Dön
            </Link>
            <span className="text-border">·</span>
            <h1 className="min-w-0 truncate text-lesson-title text-foreground">{lesson.title}</h1>
            <Badge variant="outline" className="shrink-0 border-primary/30 text-primary">
              Aktif Ders
            </Badge>
          </div>

          {lesson.locked ? (
            <LockedLessonBanner reason={lesson.lockReason} />
          ) : lesson.videoUrl ? (
            <LessonVideoPlayer
              lessonId={lesson.id}
              videoUrl={lesson.videoUrl}
              initialCompleted={isCompleted(lesson.id)}
            />
          ) : (
            <div className="glow-primary relative flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_center,rgba(59,91,255,0.12),transparent_70%)] bg-card">
              <div className="absolute inset-0 rounded-2xl border border-white/5" />
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
                <Clapperboard className="size-6 text-primary" />
              </div>
              <p className="text-body-sm text-muted-foreground">Bu ders için video eklenmemiş</p>
            </div>
          )}

          {!lesson.locked && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
              <TabsList variant="line" className="w-full justify-start gap-1 border-b border-border">
                <TabsTrigger value="content">Ders İçeriği</TabsTrigger>
                <TabsTrigger value="resources">Kaynaklar</TabsTrigger>
                <TabsTrigger value="notes">Notlarım</TabsTrigger>
                <TabsTrigger value="qa">Soru &amp; Cevap</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                      {moduleLessons.length === 0 && (
                        <p className="text-body-sm text-muted-foreground">Bu modülde henüz ders yok.</p>
                      )}
                      {moduleLessons.map((l) => {
                        const done = isCompleted(l.id);
                        const active = l.id === lesson.id;
                        return (
                          <Link
                            key={l.id}
                            href={`/courses/${programId}/lessons/${l.id}`}
                            className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-lesson-list transition-colors duration-200 ${
                              active ? "bg-primary/10 text-primary" : "hover:bg-accent"
                            }`}
                          >
                            {done ? (
                              <CheckCircle2 className="size-4 shrink-0 text-success" />
                            ) : (
                              <Circle className="size-4 shrink-0 text-muted-foreground" />
                            )}
                            <PlayCircle className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className={`min-w-0 flex-1 truncate ${active ? "text-primary" : "text-foreground"}`}>
                              {l.title}
                            </span>
                            {l.durationSeconds && (
                              <span className="shrink-0 text-body-xs text-muted-foreground">
                                {Math.round(l.durationSeconds / 60)} dk
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h3 className="flex items-center gap-1.5 text-body-xs text-muted-foreground">
                      <BookOpen className="size-3.5" /> DERS ÖZETİ
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-body-sm text-foreground">
                      {lesson.description || "Bu ders için henüz bir özet eklenmemiş."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h3 className="flex items-center gap-1.5 text-body-xs text-muted-foreground">
                      <ClipboardList className="size-3.5" /> AKTİF GÖREV
                    </h3>
                    <div className="mt-2">
                      <LessonActiveTask lessonId={lessonId} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="resources" className="mt-4">
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
                  {lesson.resources.length === 0 ? (
                    <p className="text-body-sm text-muted-foreground">Bu ders için kaynak eklenmemiş.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {lesson.resources.map((res) => (
                        <ExternalLink
                          key={res.id}
                          href={res.url}
                          className="flex items-center gap-2 rounded-lg border border-border p-3 text-body-sm text-foreground transition-colors duration-200 hover:bg-accent"
                        >
                          <Download className="size-4 text-primary" />
                          {res.name}
                        </ExternalLink>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
                  <LessonNotesPanel lessonId={lessonId} />
                </div>
              </TabsContent>

              <TabsContent value="qa" className="mt-4">
                <CommentSection lessonId={lessonId} />
              </TabsContent>
            </Tabs>
          )}

          {!lesson.locked && lessonQuizzes.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ListChecks className="size-4 text-primary" />
                </div>
                <h3 className="flex-1 text-card-title-sm text-foreground">
                  {moduleIndex >= 0 ? `Modül ${moduleIndex + 1} ` : ""}Sınavı
                </h3>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {lessonQuizzes.map((quiz) => (
                  <Button
                    key={quiz.id}
                    className="h-11 w-fit"
                    render={
                      <Link href={`/courses/${programId}/lessons/${lessonId}/quiz/${quiz.id}`}>
                        {quiz.title} — Başlat ({quiz.timeLimitMinutes} dk)
                      </Link>
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {!lesson.locked && <AiMentorSidebar lessonTitle={lesson.title} />}
      </div>
    </div>
  );
}
