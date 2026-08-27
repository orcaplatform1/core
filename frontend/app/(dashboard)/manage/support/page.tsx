"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ShieldAlert,
  LifeBuoy,
  Send,
  ArrowLeft,
  Trash2,
  Clock,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  useAdminTickets,
  useTicket,
  useReplyTicket,
  useUpdateTicketStatus,
  useDeleteTicket,
  type SupportTicketStatus,
} from "@/lib/hooks/use-support";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "OPEN", label: "Açık" },
  { value: "IN_PROGRESS", label: "İşlemde" },
  { value: "CLOSED", label: "Kapalı" },
];

const CATEGORY_LABELS: Record<string, string> = {
  PAYMENT: "Ödeme",
  TECHNICAL: "Teknik Sorun",
  ACCOUNT: "Hesap",
  EMAIL_PHONE_CHANGE: "E-posta/Telefon Değiştir",
  OTHER: "Diğer",
};

const STATUS_STYLES: Record<SupportTicketStatus, { label: string; color: string; icon: typeof Clock }> = {
  OPEN: { label: "Açık", color: "#3B5BFF", icon: Clock },
  IN_PROGRESS: { label: "İşlemde", color: "#F39C3D", icon: Loader2 },
  CLOSED: { label: "Kapalı", color: "#22C55E", icon: CheckCircle2 },
};

function formatClock(iso: string) {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  return `${date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} ${time}`;
}

function AdminTicketThread({ ticketId, isSuperAdmin, onBack, onDeleted }: { ticketId: string; isSuperAdmin: boolean; onBack: () => void; onDeleted: () => void }) {
  const { user: me } = useAuth();
  const { data, isLoading } = useTicket(ticketId);
  const replyTicket = useReplyTicket(ticketId);
  const updateStatus = useUpdateTicketStatus(ticketId);
  const deleteTicket = useDeleteTicket();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await replyTicket.mutateAsync(trimmed);
      setText("");
    } catch (err: any) {
      toast.error(err?.message ?? "Mesaj gönderilemedi");
    }
  }

  async function handleStatus(status: SupportTicketStatus) {
    try {
      await updateStatus.mutateAsync(status);
      toast.success("Durum güncellendi");
    } catch (err: any) {
      toast.error(err?.message ?? "Durum güncellenemedi");
    }
  }

  async function handleDelete() {
    if (!confirm("Bu destek talebini tamamen silmek istediğinize emin misiniz?")) return;
    try {
      await deleteTicket.mutateAsync(ticketId);
      toast.success("Talep silindi");
      onDeleted();
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  if (isLoading || !data) {
    return <div className="h-96 animate-pulse rounded-2xl bg-card" />;
  }

  const { ticket, messages } = data;
  const statusInfo = STATUS_STYLES[ticket.status];

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <button
          onClick={onBack}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
          aria-label="Geri"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-card-title-sm text-foreground">{ticket.subject}</p>
          <Link href={`/manage/users/${ticket.user.id}`} className="text-body-xs text-muted-foreground hover:text-primary hover:underline">
            {ticket.user.fullName} · @{ticket.user.username ?? "—"} · {CATEGORY_LABELS[ticket.category]}
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {(["OPEN", "IN_PROGRESS", "CLOSED"] as SupportTicketStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => handleStatus(s)}
              disabled={updateStatus.isPending}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                ticket.status === s ? "" : "opacity-40 hover:opacity-100"
              }`}
              style={{ backgroundColor: `${STATUS_STYLES[s].color}22`, color: STATUS_STYLES[s].color }}
            >
              {STATUS_STYLES[s].label}
            </button>
          ))}
          {isSuperAdmin && (
            <button
              onClick={handleDelete}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#EF444422] hover:text-[#EF4444]"
              aria-label="Talebi sil"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const isMe = m.senderId === me?.id;
          const isStaffMsg = m.sender.role === "STAFF" || m.sender.role === "SUPER_ADMIN";
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div
                className={`w-fit max-w-[75%] rounded-md px-3.5 py-2.5 ${
                  isMe ? "bg-primary text-primary-foreground" : "border border-border bg-card-inner text-foreground"
                }`}
              >
                {!isMe && (
                  <p className={`mb-1 text-[10px] font-semibold ${isStaffMsg ? "text-primary" : "text-muted-foreground"}`}>
                    {isStaffMsg ? "Destek Ekibi" : m.sender.fullName}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-body-sm">{m.content}</p>
              </div>
              <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">{formatClock(m.createdAt)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-card-inner p-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Yanıtınızı yazın..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={replyTicket.isPending || !text.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            aria-label="Gönder"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminSupportInner() {
  const { user: me, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const ticketParam = searchParams.get("ticket");
  const [selected, setSelected] = useState<string | null>(ticketParam);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminTickets(page, status, "");

  useEffect(() => {
    if (ticketParam) setSelected(ticketParam);
  }, [ticketParam]);

  if (authLoading) {
    return <p className="text-body-sm text-muted-foreground">Yükleniyor...</p>;
  }
  if (me?.role !== "STAFF" && me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-body-sm text-muted-foreground">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  function selectTicket(id: string) {
    setSelected(id);
    router.replace(`/manage/support?ticket=${id}`);
  }

  function backToList() {
    setSelected(null);
    router.replace("/manage/support");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-h1 text-foreground">
            <LifeBuoy className="size-6 text-primary" /> Destek Merkezi
          </h1>
          <p className="text-body-sm text-muted-foreground">Kullanıcılardan gelen destek taleplerini yanıtla ve yönet.</p>
        </div>
        <Link href="/manage" className="text-body-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      {selected ? (
        <AdminTicketThread
          ticketId={selected}
          isSuperAdmin={me?.role === "SUPER_ADMIN"}
          onBack={backToList}
          onDeleted={backToList}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatus(tab.value);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-label transition-colors ${
                  status === tab.value ? "bg-primary text-primary-foreground" : "bg-card-inner text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4 divide-y divide-border">
            {isLoading ? (
              <p className="py-6 text-body-sm text-muted-foreground">Yükleniyor...</p>
            ) : !data || data.data.length === 0 ? (
              <p className="py-6 text-body-sm text-muted-foreground">Kayıt yok.</p>
            ) : (
              data.data.map((t) => {
                const statusInfo = STATUS_STYLES[t.status];
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTicket(t.id)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-card-title-sm text-foreground">{t.subject}</p>
                      <p className="truncate text-body-xs text-muted-foreground">
                        {t.user.fullName} · {CATEGORY_LABELS[t.category]} · {new Date(t.updatedAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <span
                      className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ backgroundColor: `${statusInfo.color}22`, color: statusInfo.color }}
                    >
                      <statusInfo.icon className="size-3" /> {statusInfo.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {data && data.pagination.totalPages > 1 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`size-8 rounded-lg text-label ${
                    p === page ? "bg-primary text-white" : "bg-card-inner text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminSupportPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-card" />}>
      <AdminSupportInner />
    </Suspense>
  );
}
