"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Download, Lock } from "lucide-react";
import { toast } from "sonner";
import { useLesson, useMyProgress } from "@/lib/hooks/use-curriculum";
import { useAllQuizzes } from "@/lib/hooks/use-quiz";
import { ListChecks } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LessonVideoPlayer } from "@/components/lessons/lesson-video-player";
import { ApiError } from "@/context/auth-context";

export default function LessonPage({
  params,
}: {
  params: Promise<{ programId: string; lessonId: string }>;
}) {
  const { programId, lessonId } = use(params);
  const router = useRouter();
  const { data: lesson, isLoading, error } = useLesson(lessonId);
  const { data: myProgress } = useMyProgress();
  const { data: allQuizzes } = useAllQuizzes();
  const lessonQuizzes = (allQuizzes ?? []).filter((q) => q.lessonId === lessonId);

  useEffect(() => {
    if (error instanceof ApiError && error.status === 403) {
      toast.error(error.message);
      router.replace(`/programs/${programId}`);
    }
  }, [error, programId, router]);

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-card" />;
  }

  if (error || !lesson) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-20 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Bu derse erişim sağlanamadı.</p>
      </div>
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

      {lesson.videoUrl ? (
        <LessonVideoPlayer
          lessonId={lesson.id}
          videoUrl={lesson.videoUrl}
          initialCompleted={
            myProgress?.some((p) => p.lessonId === lesson.id && p.completed) ?? false
          }
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-border bg-card">
          <p className="text-sm text-muted-foreground">Bu ders için video eklenmemiş</p>
        </div>
      )}

      {lessonQuizzes.length > 0 && (
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
              <a
                key={res.id}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-foreground transition-colors duration-200 hover:bg-accent"
              >
                <Download className="size-4 text-primary" />
                {res.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
