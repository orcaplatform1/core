"use client";
import { useState } from "react";
import Link from "next/link";
import { Lock, Check, X, Trash2, MessageSquare, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import {
  useAdminComments,
  useModerateComment,
  useAdminDeleteComment,
  useAdminCommentReports,
} from "@/lib/hooks/use-comments";
import { SuspendUserButton } from "@/components/moderation/suspend-user-button";

const STATUS_TABS = [
  { value: "PENDING", label: "Bekleyen" },
  { value: "APPROVED", label: "Onaylı" },
  { value: "REJECTED", label: "Reddedilen" },
  { value: "REPORTS", label: "Şikayetler" },
] as const;

type ViewValue = (typeof STATUS_TABS)[number]["value"];

function ReportsView() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminCommentReports(page);
  const remove = useAdminDeleteComment();

  async function handleDelete(id: string) {
    if (!confirm("Bu yorumu kalıcı olarak silmek istediğinize emin misiniz?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Yorum silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {isLoading ? (
        <p className="p-6 text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
      ) : !data || data.data.length === 0 ? (
        <p className="p-6 text-body-sm text-[#A8A6A0]">Şikayet yok.</p>
      ) : (
        <div className="divide-y divide-border">
          {data.data.map((r) => (
            <div key={r.id} className="p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-body-sm text-[#F5F1EA]">
                  <Link href={`/profile/${r.reporter.id}`} className="font-medium hover:underline">
                    {r.reporter.fullName}
                  </Link>
                  <span className="text-[#A8A6A0]"> şikayet etti: </span>
                  <Link href={`/profile/${r.comment.user.id}`} className="font-medium hover:underline">
                    {r.comment.user.fullName}
                  </Link>
                  <span className="text-body-xs text-[#A8A6A0]"> @{r.comment.user.username}</span>
                </p>
                <p className="text-body-xs text-[#A8A6A0]">{new Date(r.createdAt).toLocaleString("tr-TR")}</p>
              </div>
              <p className="flex items-center gap-1 text-body-xs text-[#A8A6A0]">
                <MessageSquare size={12} /> {r.comment.lesson.title}
              </p>
              <p className="rounded-lg border border-[#F39C3D40] bg-[#F39C3D11] p-2 text-body-xs text-[#F5F1EA] whitespace-pre-wrap">
                {r.comment.content}
              </p>
              <p className="text-body-xs text-[#A8A6A0]">Sebep: {r.reason}</p>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={remove.isPending}
                  className="text-[#EF4444] hover:bg-[#EF444422]"
                  onClick={() => handleDelete(r.comment.id)}
                >
                  <Trash2 size={14} className="mr-1" />
                  Sil
                </Button>
                <SuspendUserButton
                  userId={r.comment.user.id}
                  userName={r.comment.user.fullName}
                  type="COMMENT"
                  reason={`Şikayet: ${r.reason}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-border p-3">
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

export default function AdminCommentsPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const [view, setView] = useState<ViewValue>("PENDING");
  const status = view === "REPORTS" ? undefined : view;
  const { data: comments, isLoading } = useAdminComments((status ?? "PENDING") as "PENDING" | "APPROVED" | "REJECTED");
  const moderate = useModerateComment();
  const remove = useAdminDeleteComment();

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

  async function handleModerate(id: string, next: "APPROVED" | "REJECTED") {
    try {
      await moderate.mutateAsync({ id, status: next });
      toast.success(next === "APPROVED" ? "Yorum onaylandı" : "Yorum reddedildi");
    } catch (err: any) {
      toast.error(err?.message ?? "İşlem başarısız");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu yorumu kalıcı olarak silmek istediğinize emin misiniz?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Yorum silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-h1 text-[#F5F1EA]">Yorum Moderasyonu</h1>
          <p className="text-body-sm text-[#A8A6A0]">Öğrenci yorumlarını onayla, reddet, sil veya şikayetleri değerlendir.</p>
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
            className={`flex items-center gap-1 px-4 py-1.5 text-body-sm ${view === tab.value ? "bg-primary text-white" : "bg-card-inner text-[#A8A6A0]"}`}
          >
            {tab.value === "REPORTS" && <Flag size={12} />}
            {tab.label}
          </button>
        ))}
      </div>

      {view === "REPORTS" ? (
        <ReportsView />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <p className="p-6 text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
          ) : !comments || comments.length === 0 ? (
            <p className="p-6 text-body-sm text-[#A8A6A0]">Bu durumda yorum yok.</p>
          ) : (
            <div className="divide-y divide-border">
              {comments.map((c) => (
                <div key={c.id} className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/profile/${c.user.id}`} className="text-card-title-sm text-[#F5F1EA] hover:underline">
                        {c.user.fullName}{" "}
                        <span className="text-body-xs text-[#A8A6A0]">@{c.user.username}</span>
                      </Link>
                      <p className="mt-0.5 flex items-center gap-1 text-body-xs text-[#A8A6A0]">
                        <MessageSquare size={12} />
                        {c.lesson.module.program.title} · {c.lesson.module.title} · {c.lesson.title}
                      </p>
                    </div>
                    <p className="text-body-xs text-[#A8A6A0]">
                      {new Date(c.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </div>

                  <p className="rounded-lg border border-border bg-card-inner p-3 text-body-sm text-[#F5F1EA] whitespace-pre-wrap">
                    {c.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {view === "PENDING" && (
                      <div className="flex gap-2">
                        <Button size="sm" disabled={moderate.isPending} onClick={() => handleModerate(c.id, "APPROVED")}>
                          <Check size={14} className="mr-1" />
                          Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={moderate.isPending}
                          onClick={() => handleModerate(c.id, "REJECTED")}
                        >
                          <X size={14} className="mr-1" />
                          Reddet
                        </Button>
                      </div>
                    )}
                    <div className="ml-auto flex gap-2">
                      <SuspendUserButton userId={c.user.id} userName={c.user.fullName} type="COMMENT" />
                      {(me?.role === "STAFF" || me?.role === "SUPER_ADMIN") && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={remove.isPending}
                          className="text-[#EF4444] hover:bg-[#EF444422]"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 size={14} className="mr-1" />
                          Sil
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
