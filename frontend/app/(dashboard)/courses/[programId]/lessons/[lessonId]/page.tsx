"use client";

import { use } from "react";
import { FileText, Download, Clapperboard } from "lucide-react";
import { ExternalLink } from "@/components/ui/external-link";
import { ErrorCard } from "@/components/errors/error-card";
import { useLesson, useMyProgress } from "@/lib/hooks/use-curriculum";
import { useAllQuizzes } from "@/lib/hooks/use-quiz";
import { ListChecks } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LessonVideoPlayer } from "@/components/lessons/lesson-video-player";
import { LockedLessonBanner } from "@/components/lessons/locked-lesson-banner";
import { CommentSection } from "@/components/lessons/comment-section";

export default function LessonPage({
  params,
}: {
  params: Promise<{ programId: string; lessonId: string }>;
}) {
  const { programId, lessonId } = use(params);
  const { data: lesson, isLoading, error } = useLesson(lessonId);
  const { data: myProgress } = useMyProgress();
  const { data: allQuizzes } = useAllQuizzes();
  const lessonQuizzes = (allQuizzes ?? []).filter((q) => q.lessonId === lessonId);

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{lesson.title}</h1>
        {lesson.description && (
          <p className="mt-1 text-sm text-muted-foreground">{lesson.description}</p>
        )}
      </div>

      {lesson.locked ? (
        <LockedLessonBanner reason={lesson.lockReason} />
      ) : lesson.videoUrl ? (
        <LessonVideoPlayer
          lessonId={lesson.id}
          videoUrl={lesson.videoUrl}
          initialCompleted={
            myProgress?.some((p) => p.lessonId === lesson.id && p.completed) ?? false
          }
        />
      ) : (
        <div className="glow-primary relative flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_center,rgba(59,91,255,0.12),transparent_70%)] bg-card">
          <div className="absolute inset-0 rounded-2xl border border-white/5" />
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
            <Clapperboard className="size-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Bu ders için video eklenmemiş</p>
        </div>
      )}

      {!lesson.locked && lessonQuizzes.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ListChecks className="size-4" /> Ders Sınavı
          </h3>
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

      {lesson.resources.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="size-4" /> Ders Kaynakları
          </h3>
          <div className="mt-4 flex flex-col gap-2">
            {lesson.resources.map((res) => (
              <ExternalLink
                key={res.id}
                href={res.url}
                className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-foreground transition-colors duration-200 hover:bg-accent"
              >
                <Download className="size-4 text-primary" />
                {res.name}
              </ExternalLink>
            ))}
          </div>
        </div>
      )}

      {!lesson.locked && <CommentSection lessonId={lessonId} />}
    </div>
  );
}
