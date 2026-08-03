"use client";
import { useEffect, useState } from "react";
import { ClipboardList, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLessonTask } from "@/lib/hooks/use-curriculum";
import { useUpsertLessonTask, useDeleteLessonTask } from "@/lib/hooks/use-admin-curriculum";

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-sm text-[#A8A6A0] outline-none focus:border-primary w-full";
}

// SUPER_ADMIN'in bir derse "Aktif Gorev" karti tanimladigi/duzenledigi panel.
// Ders basina en fazla bir gorev olabilir (schema: LessonTask.lessonId @unique).
export function LessonTaskEditor({ lessonId }: { lessonId: string }) {
  const { data, isLoading } = useLessonTask(lessonId);
  const upsertTask = useUpsertLessonTask(lessonId);
  const deleteTask = useDeleteLessonTask(lessonId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetCount, setTargetCount] = useState("1");

  useEffect(() => {
    if (data?.task) {
      setTitle(data.task.title);
      setDescription(data.task.description);
      setTargetCount(String(data.task.targetCount));
    }
  }, [data?.task]);

  async function handleSave() {
    const count = Number(targetCount);
    if (!title.trim() || !description.trim() || !count || count < 1) {
      toast.error("Görev başlığı, açıklaması ve geçerli bir hedef sayı gerekli");
      return;
    }
    try {
      await upsertTask.mutateAsync({ title: title.trim(), description: description.trim(), targetCount: count });
      toast.success("Aktif görev kaydedildi");
    } catch (err: any) {
      toast.error(err?.message ?? "Kaydedilemedi");
    }
  }

  async function handleDelete() {
    if (!confirm("Bu dersin aktif görevini silmek istediğine emin misin?")) return;
    try {
      await deleteTask.mutateAsync();
      setTitle("");
      setDescription("");
      setTargetCount("1");
      toast.success("Görev silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card-inner p-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#F5F1EA]">
        <ClipboardList size={12} /> Aktif Görev
      </p>
      {isLoading ? (
        <p className="text-xs text-[#A8A6A0]">Yükleniyor...</p>
      ) : (
        <>
          <input
            className={inputClass()}
            placeholder="Görev başlığı (örn. Grafik Üzerinde CHOCH Örneği Bul)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className={inputClass()}
            placeholder="Görev açıklaması"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              className={inputClass()}
              placeholder="Hedef sayı (örn. 2)"
              type="number"
              min={1}
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
            />
            <Button size="sm" onClick={handleSave} disabled={upsertTask.isPending} className="shrink-0">
              Kaydet
            </Button>
            {data?.task && (
              <Button size="sm" variant="ghost" onClick={handleDelete} className="shrink-0">
                <Trash2 size={12} className="text-danger" />
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
