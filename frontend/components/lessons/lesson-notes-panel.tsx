"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, Loader2 } from "lucide-react";
import { useMyLessonNote, useSaveLessonNote } from "@/lib/hooks/use-curriculum";

const AUTOSAVE_DELAY_MS = 1500;

export function LessonNotesPanel({ lessonId }: { lessonId: string }) {
  const { data: note, isLoading } = useMyLessonNote(lessonId);
  const { mutate: saveNote, isPending } = useSaveLessonNote(lessonId);
  const [value, setValue] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sunucudan gelen notu sadece ilk yuklemede yaz - kullanici yazarken query
  // yeniden calisirsa (orn. baska sekmede kayit) imlecin altindaki metni ezmesin.
  useEffect(() => {
    if (!hydratedRef.current && note !== undefined) {
      setValue(note?.content ?? "");
      setSavedAt(note?.updatedAt ?? null);
      hydratedRef.current = true;
    }
  }, [note]);

  function persist(content: string) {
    saveNote(content, {
      onSuccess: (data) => {
        setDirty(false);
        setSavedAt(data?.updatedAt ?? new Date().toISOString());
      },
    });
  }

  function handleChange(next: string) {
    setValue(next);
    setDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => persist(next), AUTOSAVE_DELAY_MS);
  }

  function handleBlur() {
    if (!dirty) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    persist(value);
  }

  // Sekmeden ayrilirken/kapatirken bekleyen otomatik kaydi kaybetmemek icin son bir deneme.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-card-inner" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <BookOpen className="size-3.5" /> Bu derse özel notların — sadece sen görebilirsin
        </p>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {isPending ? (
            <>
              <Loader2 className="size-3 animate-spin" /> Kaydediliyor...
            </>
          ) : dirty ? (
            "Kaydedilmedi"
          ) : savedAt ? (
            <>
              <Check className="size-3 text-success" /> Kaydedildi
            </>
          ) : null}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Bu ders hakkında notlarını buraya yaz..."
        rows={8}
        className="w-full resize-y rounded-xl border border-border bg-card-inner p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </div>
  );
}
