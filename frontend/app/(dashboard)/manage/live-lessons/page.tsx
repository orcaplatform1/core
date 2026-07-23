"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Plus, Trash2, Radio, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
  useAdminLiveLessons,
  useCreateLiveLesson,
  useDeleteLiveLesson,
} from "@/lib/hooks/use-admin-live-lessons";

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-sm text-[#D7E1F8] outline-none focus:border-primary w-full";
}

export default function AdminLiveLessonsPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const { data: liveLessons, isLoading } = useAdminLiveLessons();
  const createLiveLesson = useCreateLiveLesson();
  const deleteLiveLesson = useDeleteLiveLesson();

  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    title: "",
    scheduledAt: "",
    durationMinutes: "60",
    discordLink: "",
  });

  if (authLoading) {
    return <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#FF5C5C" className="mx-auto" />
        <p className="text-sm text-[#8D9BB6]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  async function submitCreate() {
    if (!form.title.trim() || !form.scheduledAt || !form.discordLink.trim()) {
      toast.error("Başlık, tarih ve Discord linki gerekli");
      return;
    }
    try {
      await createLiveLesson.mutateAsync({
        title: form.title.trim(),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes) || 60,
        discordLink: form.discordLink.trim(),
      });
      toast.success("Canlı ders oluşturuldu, öğrencilere bildirim gönderildi");
      setForm({ title: "", scheduledAt: "", durationMinutes: "60", discordLink: "" });
      setShowNew(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Oluşturulamadı");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu canlı dersi silmek istediğine emin misin?")) return;
    try {
      await deleteLiveLesson.mutateAsync(id);
      toast.success("Silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  const sorted = [...(liveLessons ?? [])].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F8FF]">Canlı Dersler</h1>
          <p className="text-sm text-[#8D9BB6]">Discord üzerinden yapılacak canlı dersleri planla.</p>
        </div>
        <Link href="/manage" className="text-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      {!showNew && (
        <Button onClick={() => setShowNew(true)}>
          <Plus size={16} className="mr-1" /> Yeni Canlı Ders
        </Button>
      )}

      {showNew && (
        <div className="rounded-xl border border-border bg-card-inner p-4 space-y-3">
          <input
            className={inputClass()}
            placeholder="Başlık (örn. Haftalık ICT Analizi)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputClass()}
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            />
            <input
              className={inputClass()}
              placeholder="Süre (dk)"
              type="number"
              min={1}
              value={form.durationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            />
          </div>
          <input
            className={inputClass()}
            placeholder="Discord davet linki"
            value={form.discordLink}
            onChange={(e) => setForm((f) => ({ ...f, discordLink: e.target.value }))}
          />
          <p className="text-xs text-[#8D9BB6]">
            Oluşturunca tüm öğrencilere otomatik bildirim gönderilir. Ders sadece bu sayfadan
            duyurulur, site içinde canlı yayın olmaz — öğrenci geri sayımı görüp Discord'a yönlenir.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={submitCreate} disabled={createLiveLesson.isPending}>
              <Check size={14} className="mr-1" /> Oluştur
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>
              <X size={14} className="mr-1" /> İptal
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-[#8D9BB6]">Henüz canlı ders planlanmadı.</p>
        ) : (
          sorted.map((l) => {
            const isPast = new Date(l.scheduledAt).getTime() < Date.now();
            return (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#355CFF22]">
                    <Radio size={18} color="#355CFF" />
                  </div>
                  <div>
                    <p className={`font-medium ${isPast ? "text-[#8D9BB6]" : "text-[#F5F8FF]"}`}>
                      {l.title}
                    </p>
                    <p className="text-xs text-[#8D9BB6]">
                      {new Date(l.scheduledAt).toLocaleString("tr-TR")} · {l.durationMinutes} dk
                      {isPast && " · geçti"}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(l.id)}>
                  <Trash2 size={14} className="text-danger" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
