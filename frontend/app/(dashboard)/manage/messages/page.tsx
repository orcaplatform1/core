"use client";
import { useState } from "react";
import Link from "next/link";
import { Lock, MessageSquare, UserX, Flag, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useAdminDmLog, useAdminDmBlocks, useAdminDmReports } from "@/lib/hooks/use-dm";
import { SuspendUserButton } from "@/components/moderation/suspend-user-button";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SENT: { label: "Başarılı", color: "#22C55E" },
  BLOCKED_PROFANITY: { label: "Küfür/hakaret", color: "#EF4444" },
  BLOCKED_RATE_LIMIT: { label: "Spam sınırı", color: "#F39C3D" },
  BLOCKED_USER_BLOCKED: { label: "Kullanıcı engelli", color: "#F39C3D" },
};

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`size-8 rounded-lg text-xs font-medium ${
            p === page ? "bg-primary text-white" : "bg-card-inner text-[#A8A6A0]"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

function MessageLogSection() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminDmLog(page);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[#F5F1EA]">
        <MessageSquare size={16} className="text-primary" /> Mesaj Kayıtları {data && `(toplam ${data.pagination.total})`}
      </h2>
      <p className="mt-1 text-xs text-[#A8A6A0]">
        Başarılı ve başarısız (spam/küfür/engel nedeniyle reddedilen) tüm mesaj denemeleri, en yeniden eskiye.
      </p>
      <div className="mt-4 divide-y divide-border">
        {isLoading ? (
          <p className="py-6 text-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : !data || data.data.length === 0 ? (
          <p className="py-6 text-sm text-[#A8A6A0]">Kayıt yok.</p>
        ) : (
          data.data.map((m) => {
            const statusInfo = STATUS_LABELS[m.status];
            return (
              <div key={m.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[#F5F1EA]">
                    <Link href={`/manage/users/${m.sender.id}`} className="font-medium hover:text-primary hover:underline">
                      {m.sender.fullName}
                    </Link>
                    <span className="text-[#A8A6A0]"> → </span>
                    <Link href={`/manage/users/${m.recipient.id}`} className="font-medium hover:text-primary hover:underline">
                      {m.recipient.fullName}
                    </Link>
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: `${statusInfo.color}22`, color: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>
                    <span className="text-[11px] text-[#A8A6A0]">{new Date(m.createdAt).toLocaleString("tr-TR")}</span>
                  </div>
                </div>
                <p className="mt-1 rounded-lg border border-border bg-card-inner p-2 text-xs text-[#F5F1EA] whitespace-pre-wrap">
                  {m.content}
                </p>
                {m.blockedReason && <p className="mt-1 text-[11px] text-[#EF4444]">Neden: {m.blockedReason}</p>}
                {m.deletedAt && <p className="mt-1 text-[11px] text-[#F39C3D]">SUPER_ADMIN tarafından silindi</p>}
                {m.editedAt && <p className="mt-1 text-[11px] text-[#A8A6A0]">Düzenlendi · {new Date(m.editedAt).toLocaleString("tr-TR")}</p>}
              </div>
            );
          })
        )}
      </div>
      {data && <Pager page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
    </div>
  );
}

function BlockActionsSection() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminDmBlocks(page);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[#F5F1EA]">
        <UserX size={16} className="text-[#EF4444]" /> Engelleme Hareketleri {data && `(toplam ${data.pagination.total})`}
      </h2>
      <p className="mt-1 text-xs text-[#A8A6A0]">Kim kimi ne zaman engellemiş, en yeniden eskiye.</p>
      <div className="mt-4 divide-y divide-border">
        {isLoading ? (
          <p className="py-6 text-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : !data || data.data.length === 0 ? (
          <p className="py-6 text-sm text-[#A8A6A0]">Kayıt yok.</p>
        ) : (
          data.data.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-2.5">
              <p className="text-sm text-[#F5F1EA]">
                <Link href={`/manage/users/${b.blocker.id}`} className="font-medium hover:text-primary hover:underline">
                  {b.blocker.fullName}
                </Link>
                <span className="text-[#A8A6A0]"> engelledi → </span>
                <Link href={`/manage/users/${b.blocked.id}`} className="font-medium hover:text-primary hover:underline">
                  {b.blocked.fullName}
                </Link>
              </p>
              <span className="text-[11px] text-[#A8A6A0]">{new Date(b.createdAt).toLocaleString("tr-TR")}</span>
            </div>
          ))
        )}
      </div>
      {data && <Pager page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
    </div>
  );
}

function ReportsSection() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminDmReports(page);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[#F5F1EA]">
        <Flag size={16} className="text-[#F39C3D]" /> Şikayetler {data && `(toplam ${data.pagination.total})`}
      </h2>
      <div className="mt-4 divide-y divide-border">
        {isLoading ? (
          <p className="py-6 text-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : !data || data.data.length === 0 ? (
          <p className="py-6 text-sm text-[#A8A6A0]">Şikayet yok.</p>
        ) : (
          data.data.map((r) => (
            <div key={r.id} className="py-3">
              <p className="text-sm text-[#F5F1EA]">
                <Link href={`/manage/users/${r.reporter.id}`} className="font-medium hover:text-primary hover:underline">
                  {r.reporter.fullName}
                </Link>
                <span className="text-[#A8A6A0]"> şikayet etti: </span>
                <Link href={`/manage/users/${r.message.sender.id}`} className="font-medium hover:text-primary hover:underline">
                  {r.message.sender.fullName}
                </Link>
                <span className="text-[#A8A6A0]"> → </span>
                <Link href={`/manage/users/${r.message.recipient.id}`} className="font-medium hover:text-primary hover:underline">
                  {r.message.recipient.fullName}
                </Link>
              </p>
              <p className="mt-1 rounded-lg border border-[#F39C3D40] bg-[#F39C3D11] p-2 text-xs text-[#F5F1EA]">
                "{r.message.content}"
              </p>
              <p className="mt-1 text-xs text-[#A8A6A0]">Sebep: {r.reason}</p>
              <p className="mt-0.5 text-[11px] text-[#A8A6A0]">{new Date(r.createdAt).toLocaleString("tr-TR")}</p>
              <div className="mt-2 flex justify-end">
                <SuspendUserButton
                  userId={r.message.sender.id}
                  userName={r.message.sender.fullName}
                  type="DM"
                  reason={`Şikayet: ${r.reason}`}
                />
              </div>
            </div>
          ))
        )}
      </div>
      {data && <Pager page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
    </div>
  );
}

export default function AdminMessagesPage() {
  const { user: me, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <Lock size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F1EA]">Mesajlaşma Denetimi</h1>
          <p className="text-sm text-[#A8A6A0]">Tüm özel mesajlar, engelleme hareketleri ve şikayetler.</p>
        </div>
        <Link href="/manage" className="text-sm text-primary hover:underline">
          ← Manage Dashboard
        </Link>
      </div>

      <MessageLogSection />
      <BlockActionsSection />
      <ReportsSection />
    </div>
  );
}
