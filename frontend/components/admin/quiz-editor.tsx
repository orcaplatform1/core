"use client";
import { useState } from "react";
import { HelpCircle, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAllQuizzes } from "@/lib/hooks/use-quiz";
import {
  useAllQuestions,
  useAllAnswers,
  useCreateQuiz,
  useUpdateQuiz,
  useDeleteQuiz,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useCreateAnswer,
  useUpdateAnswer,
  useDeleteAnswer,
} from "@/lib/hooks/use-admin-quiz";

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-xs text-[#A8A6A0] outline-none focus:border-primary w-full";
}

// SUPER_ADMIN'in bir dersin quiz'lerini (soru + şık + doğru cevap) yönettiği panel.
// GET /questions ve /answers admin-only olduğu için bu bileşen dışında hiçbir yerde
// doğru cevaplar açığa çıkmıyor.
export function QuizEditor({ lessonId }: { lessonId: string }) {
  const { data: allQuizzes, isLoading: loadingQuizzes } = useAllQuizzes();
  const { data: allQuestions } = useAllQuestions();
  const { data: allAnswers } = useAllAnswers();

  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const deleteQuiz = useDeleteQuiz();

  const quizzes = (allQuizzes ?? []).filter((q) => q.lessonId === lessonId);

  const [showNewQuiz, setShowNewQuiz] = useState(false);
  const [quizForm, setQuizForm] = useState({ title: "", description: "", timeLimitMinutes: "20" });
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  async function submitNewQuiz() {
    if (!quizForm.title.trim()) {
      toast.error("Quiz başlığı gerekli");
      return;
    }
    try {
      await createQuiz.mutateAsync({
        title: quizForm.title.trim(),
        description: quizForm.description || undefined,
        timeLimitMinutes: Number(quizForm.timeLimitMinutes) || undefined,
        lessonId,
      });
      toast.success("Quiz oluşturuldu");
      setQuizForm({ title: "", description: "", timeLimitMinutes: "20" });
      setShowNewQuiz(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Oluşturulamadı");
    }
  }

  async function submitQuizEdit(id: string) {
    if (!quizForm.title.trim()) return;
    try {
      await updateQuiz.mutateAsync({
        id,
        title: quizForm.title.trim(),
        description: quizForm.description || undefined,
        timeLimitMinutes: Number(quizForm.timeLimitMinutes) || undefined,
      });
      toast.success("Quiz güncellendi");
      setEditingQuizId(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Güncellenemedi");
    }
  }

  async function handleDeleteQuiz(id: string) {
    if (!confirm("Bu quiz'i (tüm soru/cevaplarıyla) silmek istediğine emin misin?")) return;
    try {
      await deleteQuiz.mutateAsync(id);
      toast.success("Quiz silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card-inner p-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#F5F1EA]">
        <HelpCircle size={12} /> Quiz'ler
      </p>

      {loadingQuizzes ? (
        <p className="text-xs text-[#A8A6A0]">Yükleniyor...</p>
      ) : (
        <div className="space-y-1.5">
          {quizzes.length === 0 && <p className="text-xs text-[#A8A6A0]">Henüz quiz eklenmemiş.</p>}
          {quizzes.map((quiz) => {
            const isExpanded = expandedQuiz === quiz.id;
            const isEditing = editingQuizId === quiz.id;
            const questionCount = (allQuestions ?? []).filter((q) => q.quizId === quiz.id).length;
            return (
              <div key={quiz.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between gap-2 p-2">
                  <button
                    className="flex flex-1 items-center gap-1.5 text-left"
                    onClick={() => setExpandedQuiz(isExpanded ? null : quiz.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown size={12} className="shrink-0 text-[#A8A6A0]" />
                    ) : (
                      <ChevronRight size={12} className="shrink-0 text-[#A8A6A0]" />
                    )}
                    <span className="text-xs text-[#F5F1EA]">{quiz.title}</span>
                    <span className="text-xs text-[#A8A6A0]">
                      ({questionCount} soru · {quiz.timeLimitMinutes} dk)
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingQuizId(quiz.id);
                        setQuizForm({
                          title: quiz.title,
                          description: quiz.description ?? "",
                          timeLimitMinutes: String(quiz.timeLimitMinutes),
                        });
                      }}
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteQuiz(quiz.id)}>
                      <Trash2 size={12} className="text-danger" />
                    </Button>
                  </div>
                </div>

                {isEditing && (
                  <div className="space-y-1.5 border-t border-border p-2">
                    <input
                      className={inputClass()}
                      placeholder="Başlık"
                      value={quizForm.title}
                      onChange={(e) => setQuizForm((f) => ({ ...f, title: e.target.value }))}
                    />
                    <textarea
                      className={inputClass()}
                      placeholder="Açıklama"
                      rows={2}
                      value={quizForm.description}
                      onChange={(e) => setQuizForm((f) => ({ ...f, description: e.target.value }))}
                    />
                    <input
                      className={inputClass()}
                      placeholder="Süre (dakika)"
                      type="number"
                      min={1}
                      value={quizForm.timeLimitMinutes}
                      onChange={(e) => setQuizForm((f) => ({ ...f, timeLimitMinutes: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => submitQuizEdit(quiz.id)}>
                        <Check size={12} className="mr-1" /> Kaydet
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingQuizId(null)}>
                        <X size={12} className="mr-1" /> İptal
                      </Button>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="border-t border-border bg-background/40 p-2">
                    <QuestionList quizId={quiz.id} allQuestions={allQuestions ?? []} allAnswers={allAnswers ?? []} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showNewQuiz ? (
        <div className="space-y-1.5 rounded-lg border border-border bg-card p-2">
          <input
            className={inputClass()}
            placeholder="Quiz başlığı"
            value={quizForm.title}
            onChange={(e) => setQuizForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
          />
          <textarea
            className={inputClass()}
            placeholder="Açıklama (opsiyonel)"
            rows={2}
            value={quizForm.description}
            onChange={(e) => setQuizForm((f) => ({ ...f, description: e.target.value }))}
          />
          <input
            className={inputClass()}
            placeholder="Süre (dakika)"
            type="number"
            min={1}
            value={quizForm.timeLimitMinutes}
            onChange={(e) => setQuizForm((f) => ({ ...f, timeLimitMinutes: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitNewQuiz} disabled={createQuiz.isPending}>
              Ekle
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNewQuiz(false)}>
              İptal
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowNewQuiz(true)}>
          <Plus size={12} className="mr-1" /> Quiz Ekle
        </Button>
      )}
    </div>
  );
}

function QuestionList({
  quizId,
  allQuestions,
  allAnswers,
}: {
  quizId: string;
  allQuestions: { id: string; title: string; description: string | null; explanation: string | null; quizId: string }[];
  allAnswers: { id: string; text: string; isCorrect: boolean; questionId: string }[];
}) {
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const createAnswer = useCreateAnswer();
  const updateAnswer = useUpdateAnswer();
  const deleteAnswer = useDeleteAnswer();

  const questions = allQuestions.filter((q) => q.quizId === quizId);

  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [questionForm, setQuestionForm] = useState({ title: "", explanation: "" });
  const [newAnswerTexts, setNewAnswerTexts] = useState<Record<string, string>>({});

  async function submitNewQuestion() {
    if (!questionForm.title.trim()) {
      toast.error("Soru metni gerekli");
      return;
    }
    try {
      await createQuestion.mutateAsync({
        title: questionForm.title.trim(),
        explanation: questionForm.explanation || undefined,
        quizId,
      });
      toast.success("Soru eklendi");
      setQuestionForm({ title: "", explanation: "" });
      setShowNewQuestion(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Eklenemedi");
    }
  }

  async function handleDeleteQuestion(id: string) {
    if (!confirm("Bu soruyu (tüm şıklarıyla) silmek istediğine emin misin?")) return;
    try {
      await deleteQuestion.mutateAsync(id);
      toast.success("Soru silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  async function addAnswer(questionId: string) {
    const text = (newAnswerTexts[questionId] ?? "").trim();
    if (!text) {
      toast.error("Şık metni gerekli");
      return;
    }
    try {
      await createAnswer.mutateAsync({ text, questionId });
      setNewAnswerTexts((m) => ({ ...m, [questionId]: "" }));
    } catch (err: any) {
      toast.error(err?.message ?? "Eklenemedi");
    }
  }

  async function markCorrect(questionId: string, answerId: string) {
    const questionAnswers = allAnswers.filter((a) => a.questionId === questionId);
    try {
      await Promise.all(
        questionAnswers
          .filter((a) => a.id !== answerId && a.isCorrect)
          .map((a) => updateAnswer.mutateAsync({ id: a.id, isCorrect: false }))
      );
      await updateAnswer.mutateAsync({ id: answerId, isCorrect: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Güncellenemedi");
    }
  }

  async function handleDeleteAnswer(id: string) {
    try {
      await deleteAnswer.mutateAsync(id);
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  return (
    <div className="space-y-2">
      {questions.length === 0 && <p className="text-xs text-[#A8A6A0]">Henüz soru eklenmemiş.</p>}
      {questions.map((question) => {
        const answers = allAnswers.filter((a) => a.questionId === question.id);
        return (
          <div key={question.id} className="space-y-1.5 rounded-lg border border-border bg-card p-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-[#F5F1EA]">{question.title}</p>
              <Button size="sm" variant="ghost" onClick={() => handleDeleteQuestion(question.id)} className="shrink-0">
                <Trash2 size={11} className="text-danger" />
              </Button>
            </div>
            {question.explanation && <p className="text-xs italic text-[#A8A6A0]">Açıklama: {question.explanation}</p>}

            <div className="space-y-1 pl-2">
              {answers.length === 0 && <p className="text-xs text-[#A8A6A0]">Henüz şık yok.</p>}
              {answers.map((answer) => (
                <div key={answer.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markCorrect(question.id, answer.id)}
                    aria-label="Doğru cevap olarak işaretle"
                    className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                      answer.isCorrect ? "border-success bg-success" : "border-border"
                    }`}
                  />
                  <span className={`flex-1 text-xs ${answer.isCorrect ? "text-success" : "text-[#A8A6A0]"}`}>
                    {answer.text}
                  </span>
                  <button onClick={() => handleDeleteAnswer(answer.id)} aria-label="Şıkkı sil" className="shrink-0">
                    <X size={11} className="text-[#A8A6A0] hover:text-danger" />
                  </button>
                </div>
              ))}
              <div className="flex gap-1.5">
                <input
                  className={inputClass()}
                  placeholder="Yeni şık"
                  value={newAnswerTexts[question.id] ?? ""}
                  onChange={(e) => setNewAnswerTexts((m) => ({ ...m, [question.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addAnswer(question.id);
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => addAnswer(question.id)} className="shrink-0">
                  <Plus size={11} />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {showNewQuestion ? (
        <div className="space-y-1.5 rounded-lg border border-border bg-card p-2">
          <textarea
            className={inputClass()}
            placeholder="Soru metni"
            rows={2}
            value={questionForm.title}
            onChange={(e) => setQuestionForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
          />
          <textarea
            className={inputClass()}
            placeholder="Açıklama (opsiyonel, sonuç ekranında gösterilir)"
            rows={2}
            value={questionForm.explanation}
            onChange={(e) => setQuestionForm((f) => ({ ...f, explanation: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitNewQuestion} disabled={createQuestion.isPending}>
              Ekle
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNewQuestion(false)}>
              İptal
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowNewQuestion(true)}>
          <Plus size={11} className="mr-1" /> Soru Ekle
        </Button>
      )}
    </div>
  );
}
