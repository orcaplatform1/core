"use client";
import { useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useLesson,
  useAddLessonResource,
  useRemoveLessonResource,
} from "@/lib/hooks/use-curriculum";

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-sm text-[#A8A6A0] outline-none focus:border-primary w-full";
}

// SUPER_ADMIN'in bir dersin "Kaynaklar" sekmesinde ogrenciye gorunecek
// dosyalari (cogunlukla PDF) isim+URL olarak ekleyip silebildigi panel.
export function LessonResourcesEditor({ lessonId }: { lessonId: string }) {
  const { data: lesson, isLoading } = useLesson(lessonId);
  const addResource = useAddLessonResource(lessonId);
  const removeResource = useRemoveLessonResource(lessonId);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  async function handleAdd() {
    if (!name.trim() || !url.trim()) {
      toast.error("Kaynak adı ve URL gerekli");
      return;
    }
    try {
      await addResource.mutateAsync({ name: name.trim(), url: url.trim() });
      toast.success("Kaynak eklendi");
      setName("");
      setUrl("");
    } catch (err: any) {
      toast.error(err?.message ?? "Eklenemedi");
    }
  }

  async function handleRemove(resourceId: string) {
    if (!confirm("Bu kaynağı silmek istediğine emin misin?")) return;
    try {
      await removeResource.mutateAsync(resourceId);
      toast.success("Kaynak silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card-inner p-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#F5F1EA]">
        <FileText size={12} /> Kaynaklar (PDF vb.)
      </p>
      {isLoading ? (
        <p className="text-xs text-[#A8A6A0]">Yükleniyor...</p>
      ) : (
        <div className="space-y-1.5">
          {(lesson?.resources ?? []).length === 0 && (
            <p className="text-xs text-[#A8A6A0]">Henüz kaynak eklenmemiş.</p>
          )}
          {lesson?.resources.map((res) => (
            <div
              key={res.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5"
            >
              <a
                href={res.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 truncate text-xs text-primary hover:underline"
              >
                {res.name}
              </a>
              <button onClick={() => handleRemove(res.id)} aria-label="Kaynağı sil" className="shrink-0">
                <Trash2 size={12} className="text-danger" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1.5 sm:flex-row">
        <input
          className={inputClass()}
          placeholder="Kaynak adı (örn. Ders Notu.pdf)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={inputClass()}
          placeholder="PDF / dosya URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button size="sm" onClick={handleAdd} disabled={addResource.isPending} className="shrink-0">
          <Plus size={12} className="mr-1" /> Ekle
        </Button>
      </div>
    </div>
  );
}
