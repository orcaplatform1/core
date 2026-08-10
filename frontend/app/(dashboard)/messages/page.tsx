"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Send, Pencil, Flag, Trash2, ShieldAlert, History, MessagesSquare, CheckCheck } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { usePublicProfile } from "@/lib/hooks/use-profile";
import {
  useConversations,
  useThread,
  useSendDm,
  useEditDm,
  useReportDm,
  useDeleteDm,
  type DmMessage,
} from "@/lib/hooks/use-dm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmojiPickerButton } from "@/components/ui/emoji-picker-button";

function formatClock(iso: string) {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  return `${date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} ${time}`;
}

const SEND_COOLDOWN_SECONDS = 30;
const COOLDOWN_STORAGE_KEY = "dm_last_sent_at";

function useSendCooldown() {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const last = Number(localStorage.getItem(COOLDOWN_STORAGE_KEY) || 0);
      if (!last) {
        setRemaining(0);
        return;
      }
      const left = SEND_COOLDOWN_SECONDS - Math.floor((Date.now() - last) / 1000);
      setRemaining(left > 0 ? left : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const start = () => {
    localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now()));
    setRemaining(SEND_COOLDOWN_SECONDS);
  };

  return { remaining, start };
}

function ReportDialog({ messageId, onClose }: { messageId: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const report = useReportDm();

  async function submit() {
    if (!reason.trim()) return;
    try {
      await report.mutateAsync({ id: messageId, reason: reason.trim() });
      toast.success("Şikayetiniz iletildi");
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Şikayet gönderilemedi");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="flex items-center gap-2 text-card-title-sm text-foreground">
          <Flag className="size-4 text-[#EF4444]" /> Mesajı Şikayet Et
        </h3>
        <p className="mt-1 text-body-xs text-muted-foreground">
          Bu mesajın topluluk kurallarını neden ihlal ettiğini kısaca açıklayın.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Şikayet sebebi..."
          className="mt-3 w-full resize-none rounded-lg border border-border bg-card-inner p-2.5 text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-body-xs text-muted-foreground hover:bg-accent">
            Vazgeç
          </button>
          <button
            onClick={submit}
            disabled={report.isPending || !reason.trim()}
            className="rounded-lg bg-[#EF4444] px-3 py-1.5 text-body-xs text-white disabled:opacity-50"
          >
            Şikayet Et
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isMe,
  otherUserId,
}: {
  message: DmMessage;
  isMe: boolean;
  otherUserId: string;
}) {
  const { user: me } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [showHistory, setShowHistory] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const editDm = useEditDm(otherUserId);
  const deleteDm = useDeleteDm(otherUserId);

  async function handleEditSave() {
    if (!editValue.trim()) return;
    try {
      await editDm.mutateAsync({ id: message.id, content: editValue.trim() });
      setEditing(false);
      toast.success("Mesaj düzenlendi");
    } catch (err: any) {
      toast.error(err?.message ?? "Düzenlenemedi");
    }
  }

  async function handleDelete() {
    if (!confirm("Bu mesajı silmek istediğinize emin misiniz?")) return;
    try {
      await deleteDm.mutateAsync(message.id);
      toast.success("Mesaj silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  return (
    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
      <div
        className={`group relative inline-block w-fit max-w-[75%] rounded-md px-3.5 py-2.5 ${
          isMe ? "bg-primary text-primary-foreground" : "border border-border bg-card-inner text-foreground"
        }`}
      >
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={2}
              className="w-56 resize-none rounded-lg bg-black/10 p-2 text-body-sm outline-none"
            />
            <div className="flex gap-2 text-body-xs">
              <button onClick={handleEditSave} disabled={editDm.isPending} className="font-semibold underline">
                Kaydet
              </button>
              <button onClick={() => setEditing(false)} className="opacity-70 underline">
                Vazgeç
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-body-sm">{message.content}</p>
        )}

        {!editing && (
          <div
            className={`absolute -top-3 ${isMe ? "left-0" : "right-0"} hidden gap-1 rounded-lg border border-border bg-card p-1 shadow-md group-hover:flex`}
          >
            {isMe && (
              <button onClick={() => setEditing(true)} className="rounded p-1 text-muted-foreground hover:bg-accent" aria-label="Düzenle">
                <Pencil className="size-3" />
              </button>
            )}
            <button onClick={() => setShowReport(true)} className="rounded p-1 text-muted-foreground hover:bg-accent" aria-label="Şikayet et">
              <Flag className="size-3" />
            </button>
            {(me?.role === "SUPER_ADMIN" || (me?.role === "STAFF" && isMe)) && (
              <button onClick={handleDelete} className="rounded p-1 text-[#EF4444] hover:bg-accent" aria-label="Sil (yönetici)">
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-0.5 flex items-center gap-1.5 px-1">
        <span className="text-body-xs text-muted-foreground">{formatClock(message.createdAt)}</span>
        {message.editedAt && (
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="flex items-center gap-0.5 text-body-xs text-muted-foreground underline"
          >
            <History className="size-2.5" /> düzenlendi
          </button>
        )}
        {isMe &&
          (message.readAt ? (
            <CheckCheck className="size-3.5" style={{ color: "#8B5CF6" }} />
          ) : (
            <CheckCheck className="size-3.5 text-muted-foreground/50" />
          ))}
      </div>

      {showHistory && message.edits.length > 0 && (
        <div className="mt-1 max-w-[75%] rounded-lg border border-border bg-card p-2 text-body-xs text-muted-foreground">
          {message.edits.map((e, i) => (
            <p key={i} className="border-b border-border/50 py-1 last:border-0">
              <span className="opacity-60">{new Date(e.editedAt).toLocaleString("tr-TR")}:</span> {e.previousContent}
            </p>
          ))}
        </div>
      )}

      {showReport && <ReportDialog messageId={message.id} onClose={() => setShowReport(false)} />}
    </div>
  );
}

function ThreadView({ userId }: { userId: string }) {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [text, setText] = useState("");
  const { data: thread, isLoading } = useThread(userId, page);
  const { data: partnerProfile } = usePublicProfile(userId);
  const sendDm = useSendDm(userId);
  const cooldown = useSendCooldown();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (page === 1) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length, page]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || cooldown.remaining > 0) return;
    try {
      await sendDm.mutateAsync(trimmed);
      setText("");
      cooldown.start();
    } catch (err: any) {
      toast.error(err?.message ?? "Mesaj gönderilemedi");
    }
  }

  const disabledReason =
    thread?.suspendedMessage ||
    (thread?.hasBlockedMe ? "Bu kullanıcı tarafından engellendiğiniz için mesaj yazamazsınız." : null) ||
    (thread?.isBlockedByMe ? "Bu kullanıcıyı engellediğiniz için mesaj yazamazsınız. Mesajlaşmak için engeli kaldırın." : null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-border p-4">
        <div className="relative shrink-0">
          <Avatar className="size-9">
            <AvatarImage src={partnerProfile?.avatarUrl ?? undefined} alt={partnerProfile?.fullName} />
            <AvatarFallback>{partnerProfile?.fullName?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span
            className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card ${
              thread?.otherUserOnline ? "bg-[#22C55E]" : "bg-[#EF4444]"
            }`}
          />
        </div>
        <div>
          <Link href={`/profile/${userId}`} className="text-card-title-sm text-foreground hover:underline">
            {partnerProfile?.fullName ?? "..."}
          </Link>
          {partnerProfile?.username && <p className="text-body-xs text-muted-foreground">@{partnerProfile.username}</p>}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {thread && thread.pagination.totalPages > 1 && page < thread.pagination.totalPages && (
          <div className="flex justify-center">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border px-3 py-1 text-body-xs text-muted-foreground hover:bg-accent"
            >
              Daha eski mesajları yükle
            </button>
          </div>
        )}
        {isLoading ? (
          <p className="text-center text-body-sm text-muted-foreground">Yükleniyor...</p>
        ) : !thread || thread.messages.length === 0 ? (
          <p className="text-center text-body-sm text-muted-foreground">Henüz mesaj yok, ilk mesajı siz gönderin.</p>
        ) : (
          thread.messages.map((m) => (
            <MessageBubble key={m.id} message={m} isMe={m.senderId === me?.id} otherUserId={userId} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-border p-3">
        {disabledReason ? (
          <div className="flex items-start gap-2 rounded-xl border border-[#EF444440] bg-[#EF444411] p-3 text-body-xs text-[#EF4444]">
            <ShieldAlert className="size-4 shrink-0" />
            <span>
              {disabledReason}
              {thread?.suspendedMessage && (
                <>
                  {" "}
                  <Link href="/support" className="font-semibold underline">
                    Destek sayfasına git
                  </Link>
                </>
              )}
            </span>
          </div>
        ) : (
          <div>
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
                placeholder="Bir mesaj yazın..."
                rows={1}
                disabled={cooldown.remaining > 0}
                className="flex-1 resize-none bg-transparent px-2 py-1.5 text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              />
              <EmojiPickerButton onPick={(e) => setText((v) => v + e)} />
              <button
                onClick={handleSend}
                disabled={sendDm.isPending || !text.trim() || cooldown.remaining > 0}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                aria-label="Gönder"
              >
                <Send className="size-4" />
              </button>
            </div>
            {cooldown.remaining > 0 && (
              <p className="mt-1.5 px-1 text-body-xs text-muted-foreground">
                Spam koruma filtresi nedeniyle {cooldown.remaining} saniye sonra mesaj yazabilirsiniz.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MessagesPageInner() {
  const searchParams = useSearchParams();
  const toParam = searchParams.get("to");
  const [selected, setSelected] = useState<string | null>(toParam);
  const { data: conversations, isLoading } = useConversations();

  useEffect(() => {
    if (toParam) setSelected(toParam);
  }, [toParam]);

  return (
    <div className="flex h-[70vh] max-h-[720px] min-h-[420px] overflow-hidden rounded-2xl border border-border bg-card">
      <div className="w-full max-w-xs shrink-0 overflow-y-auto border-r border-border md:block" style={{ display: selected ? undefined : "block" }}>
        <div className="border-b border-border p-4">
          <h1 className="flex items-center gap-2 text-card-title-sm text-foreground">
            <MessagesSquare className="size-4" /> Mesajlar
          </h1>
        </div>
        {isLoading ? (
          <p className="p-4 text-body-sm text-muted-foreground">Yükleniyor...</p>
        ) : !conversations || conversations.length === 0 ? (
          <p className="p-4 text-body-sm text-muted-foreground">Henüz bir sohbetiniz yok.</p>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map((c) => (
              <div
                key={c.partner.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(c.partner.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelected(c.partner.id);
                }}
                className={`flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors duration-200 hover:bg-accent ${
                  selected === c.partner.id ? "bg-accent" : ""
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="size-9">
                    <AvatarImage src={c.partner.avatarUrl ?? undefined} alt={c.partner.fullName} />
                    <AvatarFallback>{c.partner.fullName[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card ${
                      c.partner.online ? "bg-[#22C55E]" : "bg-[#EF4444]"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${c.partner.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block truncate text-body-sm text-foreground hover:text-primary hover:underline"
                  >
                    {c.partner.fullName}
                  </Link>
                  <p className="truncate text-body-xs text-muted-foreground">{c.lastMessage.content}</p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-badge text-primary-foreground">
                    {c.unreadCount > 9 ? "9+" : c.unreadCount}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`min-h-0 flex-1 ${selected ? "block" : "hidden md:flex md:items-center md:justify-center"}`}>
        {selected ? (
          <ThreadView userId={selected} />
        ) : (
          <p className="text-body-sm text-muted-foreground">Bir sohbet seçin veya bir profilden mesaj gönderin.</p>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-card" />}>
      <MessagesPageInner />
    </Suspense>
  );
}
