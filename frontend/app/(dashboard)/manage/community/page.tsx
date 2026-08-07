"use client";
import { useState } from "react";
import Link from "next/link";
import { Lock, Check, Trash2, Flag, MessageSquare, ThumbsUp, ThumbsDown, Trophy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import {
  useAdminHiddenCommunityPosts,
  useRestoreCommunityPost,
  useDeleteCommunityPost,
  useAdminActiveCommunityPosts,
  usePinCommunityPost,
  useUnpinCommunityPost,
} from "@/lib/hooks/use-community";

const TABS = [
  { value: "REPORTS", label: "Şikayet Kuyruğu" },
  { value: "FEATURE", label: "Haftanın Setup'ı" },
] as const;

type Tab = (typeof TABS)[number]["value"];

function ReportsQueueView() {
  const { data: posts, isLoading } = useAdminHiddenCommunityPosts();
  const restore = useRestoreCommunityPost();
  const remove = useDeleteCommunityPost();

  async function handleRestore(id: string) {
    try {
      await restore.mutateAsync(id);
      toast.success("Paylaşım tekrar yayına alındı");
    } catch (err: any) {
      toast.error(err?.message ?? "İşlem başarısız");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu paylaşımı kalıcı olarak silmek istediğinize emin misiniz?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Paylaşım silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {isLoading ? (
        <p className="p-6 text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
      ) : !posts || posts.length === 0 ? (
        <p className="p-6 text-body-sm text-[#A8A6A0]">Moderasyon kuyruğunda paylaşım yok.</p>
      ) : (
        <div className="divide-y divide-border">
          {posts.map((p) => (
            <div key={p.id} className="p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/profile/${p.user.id}`} className="text-card-title-sm text-[#F5F1EA] hover:underline">
                    {p.user.fullName}{" "}
                    <span className="text-body-xs text-[#A8A6A0]">@{p.user.username}</span>
                  </Link>
                  <p className="mt-0.5 text-body-xs text-[#A8A6A0]">
                    {p.symbol} · {p.timeframe} · {p.direction}
                  </p>
                </div>
                <p className="text-body-xs text-[#A8A6A0]">{new Date(p.createdAt).toLocaleString("tr-TR")}</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  className="h-32 w-full shrink-0 rounded-lg border border-border object-cover sm:w-48"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-card-title-sm text-[#F5F1EA]">{p.title}</p>
                  {p.description && (
                    <p className="line-clamp-3 text-body-xs text-[#A8A6A0] whitespace-pre-wrap">{p.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-body-xs text-[#A8A6A0]">
                    <span className="flex items-center gap-1">
                      <ThumbsUp size={12} /> {p.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsDown size={12} /> {p.dislikes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={12} /> {p.commentsCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 rounded-lg border border-[#EF444440] bg-[#EF444411] p-2.5">
                <p className="flex items-center gap-1 text-body-xs text-[#EF4444]">
                  <Flag size={12} /> Şikayetler ({p.reports.length})
                </p>
                {p.reports.map((r) => (
                  <p key={r.id} className="text-body-xs text-[#F5F1EA]">
                    <Link href={`/profile/${r.reporter.id}`} className="font-medium hover:underline">
                      {r.reporter.fullName}
                    </Link>
                    <span className="text-[#A8A6A0]">: {r.reason}</span>
                  </p>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button size="sm" disabled={restore.isPending} onClick={() => handleRestore(p.id)}>
                  <Check size={14} className="mr-1" />
                  Tekrar Yayına Al
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={remove.isPending}
                  className="text-[#EF4444] hover:bg-[#EF444422]"
                  onClick={() => handleDelete(p.id)}
                >
                  <Trash2 size={14} className="mr-1" />
                  Kalıcı Sil
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureSelectView() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminActiveCommunityPosts(page);
  const pin = usePinCommunityPost();
  const unpin = useUnpinCommunityPost();

  async function handlePin(id: string) {
    try {
      await pin.mutateAsync(id);
      toast.success("Paylaşım \"Haftanın Setup'ı\" olarak öne çıkarıldı");
    } catch (err: any) {
      toast.error(err?.message ?? "İşlem başarısız");
    }
  }

  async function handleUnpin(id: string) {
    try {
      await unpin.mutateAsync(id);
      toast.success("Öne çıkarma kaldırıldı");
    } catch (err: any) {
      toast.error(err?.message ?? "İşlem başarısız");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-body-xs text-[#A8A6A0]">
        Aynı anda yalnızca bir paylaşım öne çıkabilir — yeni bir tanesini seçtiğinizde öncekinin öne çıkarması otomatik kalkar. Otomatik haftalık rotasyon yok, manuel olarak siz değiştirirsiniz.
      </p>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : !data || data.data.length === 0 ? (
          <p className="p-6 text-body-sm text-[#A8A6A0]">Henüz paylaşım yok.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.data.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={p.title} className="h-14 w-20 shrink-0 rounded-lg border border-border object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm text-[#F5F1EA]">{p.title}</p>
                  <p className="text-body-xs text-[#A8A6A0]">
                    @{p.user.username ?? p.user.fullName} · {p.symbol} · {p.timeframe}
                  </p>
                </div>
                {p.isPinned ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-purple/15 px-2.5 py-1 text-badge text-purple">
                      <Star size={12} /> Öne Çıkan
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={unpin.isPending}
                      onClick={() => handleUnpin(p.id)}
                    >
                      Kaldır
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" disabled={pin.isPending} onClick={() => handlePin(p.id)}>
                    <Trophy size={14} className="mr-1" />
                    Öne Çıkar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {data && data.pagination.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`size-8 rounded-lg text-body-xs ${p === page ? "bg-primary text-white" : "bg-card-inner text-[#A8A6A0]"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCommunityPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("REPORTS");

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-h1 text-[#F5F1EA]">Topluluk Moderasyonu</h1>
          <p className="text-body-sm text-[#A8A6A0]">
            Şikayet eşiğini aşıp otomatik gizlenen paylaşımları incele; kalıcı sil veya tekrar yayına al. &quot;Haftanın Setup&apos;ı&quot; sekmesinden bir paylaşımı öne çıkar.
          </p>
        </div>
        <Link href="/manage" className="text-body-sm text-primary hover:underline">
          ← Manage Dashboard
        </Link>
      </div>

      <div className="flex rounded-xl border border-border overflow-hidden w-fit">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-1 px-4 py-1.5 text-body-sm ${tab === t.value ? "bg-primary text-white" : "bg-card-inner text-[#A8A6A0]"}`}
          >
            {t.value === "FEATURE" && <Trophy size={12} />}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "REPORTS" ? <ReportsQueueView /> : <FeatureSelectView />}
    </div>
  );
}
