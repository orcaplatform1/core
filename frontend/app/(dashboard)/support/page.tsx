"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LifeBuoy,
  Send,
  ArrowLeft,
  CreditCard,
  Wrench,
  UserCog,
  MoreHorizontal,
  Clock,
  Loader2,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMyTickets,
  useTicket,
  useCreateTicket,
  useReplyTicket,
  type SupportTicketCategory,
  type SupportTicketStatus,
} from "@/lib/hooks/use-support";

const CATEGORY_OPTIONS: { value: SupportTicketCategory; label: string; icon: typeof CreditCard }[] = [
  { value: "PAYMENT", label: "Ödeme", icon: CreditCard },
  { value: "TECHNICAL", label: "Teknik Sorun", icon: Wrench },
  { value: "ACCOUNT", label: "Hesap", icon: UserCog },
  { value: "EMAIL_PHONE_CHANGE", label: "E-posta/Telefon Değiştir", icon: Mail },
  { value: "OTHER", label: "Diğer", icon: MoreHorizontal },
];

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

function NewTicketForm({
  onCreated,
  initialCategory,
}: {
  onCreated: (id: string) => void;
  initialCategory?: SupportTicketCategory;
}) {
  const [category, setCategory] = useState<SupportTicketCategory>(initialCategory ?? "OTHER");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const createTicket = useCreateTicket();

  async function handleSubmit() {
    if (!subject.trim() || !message.trim()) return;
    try {
      const ticket = await createTicket.mutateAsync({ category, subject: subject.trim(), message: message.trim() });
      toast.success("Destek talebiniz oluşturuldu");
      setSubject("");
      setMessage("");
      onCreated(ticket.id);
    } catch (err: any) {
      toast.error(err?.message ?? "Talep oluşturulamadı");
    }
  }

  return (
    <div className="glow-primary rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_top,rgba(59,91,255,0.1),transparent_60%)] bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/25">
          <LifeBuoy className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-h6 text-foreground">Yeni Destek Talebi</h2>
          <p className="text-body-xs text-muted-foreground">Ekibimiz en kısa sürede sana dönüş yapacak.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-label text-muted-foreground">Kategori</label>
          <Select value={category} onValueChange={(v) => setCategory(v as SupportTicketCategory)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue>
                {() => {
                  const opt = CATEGORY_OPTIONS.find((o) => o.value === category);
                  return opt?.label ?? "Kategori seç";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <opt.icon className="size-3.5" /> {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label text-muted-foreground">Konu</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Talebini kısaca özetle"
            className="rounded-xl border border-border bg-card-inner px-3.5 py-2.5 text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label text-muted-foreground">Mesajın</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Yaşadığın sorunu veya sorunu detaylı şekilde anlat..."
            className="resize-none rounded-xl border border-border bg-card-inner px-3.5 py-2.5 text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={createTicket.isPending || !subject.trim() || !message.trim()}
          className="h-11 self-end px-6"
        >
          <Send className="size-4" /> Talebi Gönder
        </Button>
      </div>
    </div>
  );
}

function TicketThread({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { user: me } = useAuth();
  const { data, isLoading } = useTicket(ticketId);
  const replyTicket = useReplyTicket(ticketId);
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

  if (isLoading || !data) {
    return <div className="h-96 animate-pulse rounded-2xl bg-card" />;
  }

  const { ticket, messages } = data;
  const statusInfo = STATUS_STYLES[ticket.status];
  const categoryInfo = CATEGORY_OPTIONS.find((o) => o.value === ticket.category);

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <button
          onClick={onBack}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
          aria-label="Geri"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-card-title-sm text-foreground">{ticket.subject}</p>
          <p className="flex items-center gap-1 text-body-xs text-muted-foreground">
            {categoryInfo?.label}
          </p>
        </div>
        <span
          className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ backgroundColor: `${statusInfo.color}22`, color: statusInfo.color }}
        >
          <statusInfo.icon className="size-3" /> {statusInfo.label}
        </span>
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
                {!isMe && isStaffMsg && (
                  <p className="mb-1 text-[10px] font-semibold text-primary">ORCA Destek Ekibi</p>
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
        {ticket.status === "CLOSED" ? (
          <p className="rounded-xl border border-border bg-card-inner p-3 text-center text-body-xs text-muted-foreground">
            Bu talep kapatıldı. Yazdığın an talep otomatik olarak yeniden açılır.
          </p>
        ) : null}
        <div className="mt-2 flex items-end gap-2 rounded-xl border border-border bg-card-inner p-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Bir mesaj yazın..."
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

function TicketList({ onSelect }: { onSelect: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyTickets(page);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-card-title-sm text-foreground">Taleplerim {data && `(${data.pagination.total})`}</h3>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          <p className="text-body-sm text-muted-foreground">Yükleniyor...</p>
        ) : !data || data.data.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">Henüz bir destek talebin yok.</p>
        ) : (
          data.data.map((t) => {
            const statusInfo = STATUS_STYLES[t.status];
            const categoryInfo = CATEGORY_OPTIONS.find((o) => o.value === t.category);
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card-inner p-3 text-left transition-colors hover:border-primary/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-card-title-sm text-foreground">{t.subject}</p>
                  <p className="text-body-xs text-muted-foreground">
                    {categoryInfo?.label} · {new Date(t.updatedAt).toLocaleDateString("tr-TR")}
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
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`size-8 rounded-lg text-label ${
                p === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SupportPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ticketParam = searchParams.get("ticket");
  const categoryParam = searchParams.get("category") as SupportTicketCategory | null;
  const [selected, setSelected] = useState<string | null>(ticketParam);

  useEffect(() => {
    if (ticketParam) setSelected(ticketParam);
  }, [ticketParam]);

  function selectTicket(id: string) {
    setSelected(id);
    router.replace(`/support?ticket=${id}`);
  }

  function backToList() {
    setSelected(null);
    router.replace("/support");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1 text-foreground">Destek Merkezi</h1>
        <p className="text-body-sm text-muted-foreground">Sorularını ve sorunlarını bize ilet, ekibimiz sana yardımcı olsun.</p>
      </div>

      {selected ? (
        <TicketThread ticketId={selected} onBack={backToList} />
      ) : (
        <>
          <NewTicketForm onCreated={selectTicket} initialCategory={categoryParam ?? undefined} />
          <TicketList onSelect={selectTicket} />
        </>
      )}
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-card" />}>
      <SupportPageInner />
    </Suspense>
  );
}
