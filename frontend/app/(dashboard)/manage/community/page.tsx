"use client";
import Link from "next/link";
import { Lock, Check, Trash2, Flag, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import {
  useAdminHiddenCommunityPosts,
  useRestoreCommunityPost,
  useDeleteCommunityPost,
} from "@/lib/hooks/use-community";

export default function AdminCommunityPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const { data: posts, isLoading } = useAdminHiddenCommunityPosts();
  const restore = useRestoreCommunityPost();
  const remove = useDeleteCommunityPost();

  if (authLoading) {
    return <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN" && me?.role !== "STAFF") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <Lock size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F1EA]">Topluluk Moderasyonu</h1>
          <p className="text-sm text-[#A8A6A0]">
            Şikayet eşiğini aşıp otomatik gizlenen paylaşımları incele; kalıcı sil veya tekrar yayına al.
          </p>
        </div>
        <Link href="/manage" className="text-sm text-primary hover:underline">
          ← Manage Dashboard
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : !posts || posts.length === 0 ? (
          <p className="p-6 text-sm text-[#A8A6A0]">Moderasyon kuyruğunda paylaşım yok.</p>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((p) => (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/profile/${p.user.id}`} className="font-medium text-[#F5F1EA] hover:underline">
                      {p.user.fullName}{" "}
                      <span className="text-xs font-normal text-[#A8A6A0]">@{p.user.username}</span>
                    </Link>
                    <p className="mt-0.5 text-xs text-[#A8A6A0]">
                      {p.symbol} · {p.timeframe} · {p.direction}
                    </p>
                  </div>
                  <p className="text-xs text-[#A8A6A0]">{new Date(p.createdAt).toLocaleString("tr-TR")}</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="h-32 w-full shrink-0 rounded-lg border border-border object-cover sm:w-48"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm font-semibold text-[#F5F1EA]">{p.title}</p>
                    {p.description && (
                      <p className="line-clamp-3 text-xs text-[#A8A6A0] whitespace-pre-wrap">{p.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-[#A8A6A0]">
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
                  <p className="flex items-center gap-1 text-xs font-semibold text-[#EF4444]">
                    <Flag size={12} /> Şikayetler ({p.reports.length})
                  </p>
                  {p.reports.map((r) => (
                    <p key={r.id} className="text-xs text-[#F5F1EA]">
                      <Link href={`/profile/${r.reporter.id}`} className="font-medium hover:underline">
                        {r.reporter.fullName}
                      </Link>
                      <span className="text-[#A8A6A0]">: {r.reason}</span>
                    </p>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    disabled={restore.isPending}
                    onClick={() => handleRestore(p.id)}
                  >
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
    </div>
  );
}
