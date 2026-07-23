"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Send, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useBroadcastAnnouncement } from "@/lib/hooks/use-admin-announcements";

const TARGETS: { value: "ALL" | "PAID" | "FREE"; label: string; desc: string }[] = [
  { value: "ALL", label: "Herkese", desc: "Ücretsiz + ücretli tüm kullanıcılar" },
  { value: "PAID", label: "Ücretli Öğrenciler", desc: "En az bir programı olan kullanıcılar" },
  { value: "FREE", label: "Ücretsiz Üyeler", desc: "Henüz hiçbir programı olmayanlar" },
];

function inputClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-sm text-[#D7E1F8] outline-none focus:border-primary w-full";
}

export default function AdminAnnouncementsPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const broadcast = useBroadcastAnnouncement();

  const [form, setForm] = useState({
    title: "",
    message: "",
    target: "ALL" as "ALL" | "PAID" | "FREE",
    link: "",
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F8FF]">Duyuru Gönder</h1>
          <p className="text-sm text-[#8D9BB6]">
            Seçtiğin gruba bildirim olarak gönderilir.
          </p>
        </div>
        <Link href="/manage" className="text-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#355CFF22]">
            <Megaphone size={18} color="#355CFF" />
          </div>
          <p className="text-sm text-[#D7E1F8]">
            Duyuru site içi bildirim (zil ikonu) olarak düşer. Email/SMS gönderimi yok.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[#8D9BB6]">Hedef Kitle</label>
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
                <p className="text-sm font-medium text-[#F5F8FF]">{t.label}</p>
                <p className="mt-0.5 text-[11px] text-[#8D9BB6]">{t.desc}</p>
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
    </div>
  );
}
