"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Send, Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
  useBroadcastAnnouncement,
  useAdminAnnouncementsList,
  useDeleteAnnouncement,
} from "@/lib/hooks/use-admin-announcements";

const TARGET_LABELS: Record<string, string> = { ALL: "Herkese", PAID: "Ücretli Öğrenciler", FREE: "Ücretsiz Üyeler" };

const TARGETS: { value: "ALL" | "PAID" | "FREE"; label: string; desc: string }[] = [
  { value: "ALL", label: "Herkese", desc: "Ücretsiz + ücretli tüm kullanıcılar" },
  { value: "PAID", label: "Ücretli Öğrenciler", desc: "En az bir programı olan kullanıcılar" },
  { value: "FREE", label: "Ücretsiz Üyeler", desc: "Henüz hiçbir programı olmayanlar" },
];

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-sm text-[#A8A6A0] outline-none focus:border-primary w-full";
}

export default function AdminAnnouncementsPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const broadcast = useBroadcastAnnouncement();
  const { data: sentAnnouncements, isLoading: loadingSent } = useAdminAnnouncementsList();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [form, setForm] = useState({
    title: "",
    message: "",
    target: "ALL" as "ALL" | "PAID" | "FREE",
    link: "",
  });

  if (authLoading) {
    return <p className="text-body-sm text-[#A8A6A0]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-body-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  async function submit() {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Başlık ve mesaj gerekli");
      return;
    }
    const targetLabel = TARGETS.find((t) => t.value === form.target)?.label;
    if (!confirm(`Bu duyuru "${targetLabel}" grubuna gönderilecek. Emin misin?`)) return;
    try {
      await broadcast.mutateAsync({
        title: form.title.trim(),
        message: form.message.trim(),
        target: form.target,
        link: form.link.trim() || undefined,
      });
      toast.success("Duyuru gönderildi");
      setForm({ title: "", message: "", target: "ALL", link: "" });
    } catch (err: any) {
      toast.error(err?.message ?? "Gönderilemedi");
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" duyurusunu silmek istediğine emin misin? Kullanıcıların gelen kutusundan da kalkacak.`)) return;
    try {
      await deleteAnnouncement.mutateAsync(id);
      toast.success("Duyuru silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-h1 text-[#F5F1EA]">Duyuru Gönder</h1>
          <p className="text-body-sm text-[#A8A6A0]">
            Seçtiğin gruba bildirim olarak gönderilir.
          </p>
        </div>
        <Link href="/manage" className="text-body-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#3B5BFF22]">
            <Megaphone size={18} color="#3B5BFF" />
          </div>
          <p className="text-body-sm text-[#A8A6A0]">
            Duyuru site içi bildirim (zil ikonu) olarak düşer. Email/SMS gönderimi yok.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-body-xs text-[#A8A6A0]">Hedef Kitle</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TARGETS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, target: t.value }))}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  form.target === t.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card-inner hover:border-primary/50"
                }`}
              >
                <p className="text-body-sm text-[#F5F1EA]">{t.label}</p>
                <p className="mt-0.5 text-body-xs text-[#A8A6A0]">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <input
          className={inputClass()}
          placeholder="Duyuru başlığı"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <textarea
          className={inputClass()}
          placeholder="Mesaj"
          rows={4}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        />
        <input
          className={inputClass()}
          placeholder="Bağlantı (opsiyonel — örn. /programs/xyz)"
          value={form.link}
          onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
        />

        <Button onClick={submit} disabled={broadcast.isPending} className="h-11">
          <Send size={16} className="mr-2" /> Duyuruyu Gönder
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-h2 text-[#F5F1EA]">Gönderilen Duyurular</h2>
        {loadingSent ? (
          <p className="text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : !sentAnnouncements || sentAnnouncements.length === 0 ? (
          <p className="text-body-sm text-[#A8A6A0]">Henüz duyuru gönderilmemiş.</p>
        ) : (
          sentAnnouncements.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-card-title-sm text-[#F5F1EA]">{a.title}</p>
                  <p className="mt-1 text-body-sm text-[#A8A6A0]">{a.message}</p>
                  <p className="mt-2 text-body-xs text-[#A8A6A0]">
                    {TARGET_LABELS[a.target]} · {a.recipientCount} alıcı · {new Date(a.createdAt).toLocaleString("tr-TR")}
                    {a.createdByName ? ` · ${a.createdByName}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(a.id, a.title)}
                  disabled={deleteAnnouncement.isPending}
                  className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-body-xs text-[#EF4444] hover:bg-[#EF444422]"
                >
                  <Trash2 size={14} /> Sil
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
