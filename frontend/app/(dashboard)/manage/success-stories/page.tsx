"use client";
import { useState } from "react";
import Link from "next/link";
import { Lock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { useAdminSuccessStories, useModerateSuccessStory, type SuccessStoryStatus } from "@/lib/hooks/use-success-stories";

const STATUS_TABS: { value: SuccessStoryStatus; label: string }[] = [
  { value: "PENDING", label: "Bekleyen" },
  { value: "APPROVED", label: "Onaylı" },
  { value: "REJECTED", label: "Reddedilen" },
];

export default function AdminSuccessStoriesPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const [view, setView] = useState<SuccessStoryStatus>("PENDING");
  const { data: stories, isLoading } = useAdminSuccessStories(view);
  const moderate = useModerateSuccessStory();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  if (authLoading) {
    return <p className="text-body-sm text-[#A8A6A0]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN" && me?.role !== "STAFF") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <Lock size={32} color="#EF4444" className="mx-auto" />
        <p className="text-body-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  async function handleApprove(id: string) {
    try {
      await moderate.mutateAsync({ id, status: "APPROVED" });
      toast.success("Hikaye onaylandı, vitrinde yayınlandı");
    } catch (err: any) {
      toast.error(err?.message ?? "İşlem başarısız");
    }
  }

  async function handleReject(id: string) {
    try {
      await moderate.mutateAsync({ id, status: "REJECTED", rejectionReason: rejectionReason || undefined });
      toast.success("Hikaye reddedildi");
      setRejectingId(null);
      setRejectionReason("");
    } catch (err: any) {
      toast.error(err?.message ?? "İşlem başarısız");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-h1 text-[#F5F1EA]">Başarı Hikayeleri</h1>
          <p className="text-body-sm text-[#A8A6A0]">
            Mezun (quiz başarı oranı %95+) öğrencilerin gönderdiği hikayeleri onayla/reddet.
          </p>
        </div>
        <Link href="/manage" className="text-body-sm text-primary hover:underline">
          ← Manage Dashboard
        </Link>
      </div>

      <div className="flex rounded-xl border border-border overflow-hidden w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setView(tab.value)}
            className={`px-4 py-1.5 text-body-sm ${view === tab.value ? "bg-primary text-white" : "bg-card-inner text-[#A8A6A0]"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : !stories || stories.length === 0 ? (
          <p className="p-6 text-body-sm text-[#A8A6A0]">Bu durumda hikaye yok.</p>
        ) : (
          <div className="divide-y divide-border">
            {stories.map((s) => (
              <div key={s.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/profile/${s.user.id}`} className="text-card-title-sm text-[#F5F1EA] hover:underline">
                      {s.user.fullName}
                    </Link>
                    <p className="text-body-xs text-[#A8A6A0]">{s.user.email}</p>
                  </div>
                  <p className="text-body-xs text-[#A8A6A0]">{new Date(s.createdAt).toLocaleString("tr-TR")}</p>
                </div>

                <p className="text-body-sm font-medium text-[#F5F1EA]">{s.title}</p>
                <p className="rounded-lg border border-border bg-card-inner p-3 text-body-sm text-[#F5F1EA] whitespace-pre-wrap">
                  {s.content}
                </p>

                {view === "PENDING" && (
                  <div className="space-y-2">
                    {rejectingId === s.id ? (
                      <div className="flex flex-wrap gap-2">
                        <input
                          className="min-w-[220px] flex-1 rounded-xl border border-border bg-card-inner px-3 py-1.5 text-body-sm text-[#A8A6A0] outline-none focus:border-primary"
                          placeholder="Ret sebebi (opsiyonel)"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          autoFocus
                        />
                        <Button size="sm" variant="outline" disabled={moderate.isPending} onClick={() => handleReject(s.id)}>
                          Reddi Onayla
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>
                          İptal
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" disabled={moderate.isPending} onClick={() => handleApprove(s.id)}>
                          <Check size={14} className="mr-1" /> Onayla
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectingId(s.id)}>
                          <X size={14} className="mr-1" /> Reddet
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {view === "REJECTED" && s.rejectionReason && (
                  <p className="text-body-xs text-danger">Ret sebebi: {s.rejectionReason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
