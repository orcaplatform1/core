"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, CheckCircle2, XCircle, Trophy } from "lucide-react";
import {
  useQuizForTaking,
  useStartAttempt,
  useSubmitAnswer,
  useFinishAttempt,
} from "@/lib/hooks/use-quiz";
import { useLesson } from "@/lib/hooks/use-curriculum";
import type { QuizAttempt } from "@/lib/types/quiz";
import { Button } from "@/components/ui/button";

const gradeLabels: Record<NonNullable<QuizAttempt["grade"]>, string> = {
  FAILED: "Başarısız",
  GOOD: "İyi",
  SUCCESS: "Başarılı",
  EXCELLENT: "Mükemmel",
};

const gradeColors: Record<NonNullable<QuizAttempt["grade"]>, string> = {
  FAILED: "text-danger",
  GOOD: "text-warning",
  SUCCESS: "text-success",
  EXCELLENT: "text-primary",
};

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function QuizPage({
  params,
}: {
  params: Promise<{ programId: string; lessonId: string; quizId: string }>;
}) {
  const { programId, lessonId, quizId } = use(params);
  const router = useRouter();

  const { data: quiz, isLoading: loadingQuiz } = useQuizForTaking(quizId);
  const { data: lesson } = useLesson(lessonId);
  const { mutate: startAttempt } = useStartAttempt();
  const { mutate: submitAnswer } = useSubmitAnswer();
  const { mutate: finishAttempt, isPending: finishing } = useFinishAttempt();

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || !quiz || !lesson) return;
    startedRef.current = true;
    startAttempt(
      { quizId, lessonId, moduleId: lesson.module.id, programId },
      {
        onSuccess: (data) => {
          setAttempt(data);
          setRemaining(quiz.timeLimitMinutes * 60);
        },
        onError: () => {
          toast.error("Sınav başlatılamadı, tekrar dene.");
        },
      }
    );
  }, [quiz, quizId, lessonId, programId, startAttempt]);

  const handleFinish = useCallback(() => {
    if (!attempt) return;
    finishAttempt(attempt.id, {
      onSuccess: (data) => {
        setResult(data);
      },
      onError: () => {
        toast.error("Sınav bitirilirken bir sorun oluştu.");
      },
    });
  }, [attempt, finishAttempt]);

  useEffect(() => {
    if (remaining === null || result) return;
    if (remaining <= 0) {
      handleFinish();
      return;
    }
    const id = setInterval(() => setRemaining((r) => (r !== null ? r - 1 : r)), 1000);
    return () => clearInterval(id);
  }, [remaining, result, handleFinish]);

  const handleSelect = (questionId: string, answerId: string) => {
    if (!attempt || result) return;
    setAnswers((prev) => ({ ...prev, [questionId]: answerId }));
    submitAnswer({
      quizAttemptId: attempt.id,
      questionId,
      selectedAnswerId: answerId,
    });
  };

  if (loadingQuiz || !quiz) {
    return <div className="h-96 animate-pulse rounded-2xl bg-card" />;
  }

  if (result) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 rounded-2xl border border-border bg-card p-10 text-center">
        <Trophy className={`size-12 ${result.grade ? gradeColors[result.grade] : "text-muted-foreground"}`} />
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {result.grade ? gradeLabels[result.grade] : "Tamamlandı"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.passed ? "Tebrikler, sınavı geçtin!" : "Bu sefer olmadı, tekrar deneyebilirsin."}
          </p>
        </div>
        <div className="grid w-full grid-cols-3 gap-3">
          <div className="rounded-xl border border-border p-4">
            <p className="text-2xl font-bold text-foreground">%{result.percentage}</p>
            <p className="text-xs text-muted-foreground">Puan</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-success">
              <CheckCircle2 className="size-5" /> {result.correctAnswers}
            </p>
            <p className="text-xs text-muted-foreground">Doğru</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-danger">
              <XCircle className="size-5" /> {result.wrongAnswers}
            </p>
            <p className="text-xs text-muted-foreground">Yanlış</p>
          </div>
        </div>
        <Button
          className="h-12 w-full"
          onClick={() => router.push(`/courses/${programId}/lessons/${lessonId}`)}
        >
          Derse Dön
        </Button>
      </div>
    );
  }

  return (
    <div onContextMenu={(e) => e.preventDefault()} className="flex flex-col gap-6 select-none">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-xs text-muted-foreground">{quiz.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
          <Clock className="size-4" />
          {remaining !== null ? formatTime(remaining) : "--:--"}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {quiz.questions.map((q, i) => (
          <div key={q.id} className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm font-semibold text-foreground">
              {i + 1}. {q.title}
            </p>
            {q.description && (
              <p className="mt-1 text-xs text-muted-foreground">{q.description}</p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              {q.answers.map((a) => {
                const selected = answers[q.id] === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleSelect(q.id, a.id)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors duration-200 ${
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-foreground hover:bg-accent"
                    }`}
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected ? "border-primary bg-primary" : "border-border"
                      }`}
                    />
                    {a.text}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Button
        className="h-12 w-full"
        disabled={finishing || !attempt}
        onClick={handleFinish}
      >
        {finishing ? "Gönderiliyor..." : "Sınavı Bitir"}
      </Button>
    </div>
  );
}
