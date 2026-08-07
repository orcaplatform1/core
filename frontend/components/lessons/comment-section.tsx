"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  CornerDownRight,
  Trash2,
  Pencil,
  Clock,
  Star,
  Flag,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EmojiPickerButton } from "@/components/ui/emoji-picker-button";
import {
  useLessonComments,
  useCreateComment,
  useEditComment,
  useReactToComment,
  useDeleteComment,
  useReportComment,
  type CommentRow,
} from "@/lib/hooks/use-comments";

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  STUDENT: { label: "Öğrenci", color: "#3B5BFF" },
  STAFF: { label: "Yetkili", color: "#22C55E" },
  SUPER_ADMIN: { label: "Kurucu", color: "#EF4444" },
};
const PINNED_COLOR = "#F39C3D";
const PINNED_STAR_COLOR = "#EAB308";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR");
}

function renderContent(content: string) {
  // @kullaniciadi gecen kisimlari vurgular (sadece gorsel - eslesme backend'de yapiliyor)
  const parts = content.split(/(@[a-zA-Z0-9_]{2,30})/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-medium text-primary">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function Composer({
  onSubmit,
  placeholder,
  autoFocus,
  compact,
}: {
  onSubmit: (content: string) => Promise<void>;
  placeholder: string;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setValue("");
    } catch (err: any) {
      toast.error(err?.message ?? "Yorum gönderilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card-inner p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={compact ? 2 : 3}
        className="w-full resize-none bg-transparent text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <EmojiPickerButton onPick={(e) => setValue((v) => v + e)} />
        <Button
          onClick={handleSubmit}
          disabled={submitting || !value.trim()}
          className="h-8 px-4 text-xs"
        >
          {submitting ? "Gönderiliyor..." : "Gönder"}
        </Button>
      </div>
    </div>
  );
}

function ReactionButtons({
  comment,
  onReact,
}: {
  comment: CommentRow;
  onReact: (commentId: string, type: "LIKE" | "DISLIKE") => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onReact(comment.id, "LIKE")}
        className="flex items-center gap-1 text-body-xs text-muted-foreground transition-colors duration-200 hover:text-[#22C55E]"
      >
        <ThumbsUp className="size-3.5" />
        {comment.likes}
      </button>
      <button
        type="button"
        onClick={() => onReact(comment.id, "DISLIKE")}
        className="flex items-center gap-1 text-body-xs text-muted-foreground transition-colors duration-200 hover:text-[#EF4444]"
      >
        <ThumbsDown className="size-3.5" />
        {comment.dislikes}
      </button>
    </div>
  );
}

function CommentEditHistoryDialog({
  edits,
  onClose,
}: {
  edits: { previousContent: string; editedAt: string }[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="flex items-center gap-2 text-card-title-sm text-foreground">
          <Clock className="size-4 text-primary" /> Düzenleme Geçmişi
        </h3>
        <div className="mt-3 max-h-72 space-y-3 overflow-y-auto">
          {edits.map((e, i) => (
            <div key={i} className="rounded-lg border border-border bg-card-inner p-2.5">
              <p className="text-body-xs text-muted-foreground">
                {new Date(e.editedAt).toLocaleString("tr-TR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-body-sm text-foreground">{e.previousContent}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-body-xs text-muted-foreground hover:bg-accent">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentReportDialog({ commentId, onClose }: { commentId: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const report = useReportComment();

  async function submit() {
    if (!reason.trim()) return;
    try {
      await report.mutateAsync({ id: commentId, reason: reason.trim() });
      toast.success("Şikayetiniz iletildi");
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Şikayet gönderilemedi");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="flex items-center gap-2 text-card-title-sm text-foreground">
          <Flag className="size-4 text-[#EF4444]" /> Yorumu Şikayet Et
        </h3>
        <p className="mt-1 text-body-xs text-muted-foreground">
          Bu yorumun topluluk kurallarını neden ihlal ettiğini kısaca açıklayın.
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
            className="rounded-lg bg-[#EF4444] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Şikayet Et
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  lessonId,
  isTopLevel,
  pinned,
  onReact,
  onDelete,
}: {
  comment: CommentRow;
  lessonId: string;
  isTopLevel: boolean;
  pinned?: boolean;
  onReact: (commentId: string, type: "LIKE" | "DISLIKE") => void;
  onDelete: (commentId: string) => void;
}) {
  const { user: me } = useAuth();
  const [replying, setReplying] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.content);
  const [showHistory, setShowHistory] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const createComment = useCreateComment(lessonId);
  const editComment = useEditComment(lessonId);
  const roleBadge = ROLE_BADGES[comment.user.role];
  const visibleReplies = showAllReplies ? comment.replies : comment.replies.slice(-1);
  const isAuthor = me?.id === comment.user.id;
  // STAFF sadece kendi yazdigi yorumu/cevabi silebilir, SUPER_ADMIN herkesinkini silebilir.
  const canDelete = me?.role === "SUPER_ADMIN" || (me?.role === "STAFF" && isAuthor);
  const isStaffSideComment = comment.user.role === "STAFF" || comment.user.role === "SUPER_ADMIN";

  async function handleSaveEdit() {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    try {
      await editComment.mutateAsync({ id: comment.id, content: trimmed });
      setEditing(false);
      toast.success("Yorum düzenlendi");
    } catch (err: any) {
      toast.error(err?.message ?? "Yorum düzenlenemedi");
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={`rounded-xl border p-3 ${
          isStaffSideComment
            ? "border-[#EF444440] bg-[#EF44440D]"
            : pinned
              ? "border-[#F39C3D40] bg-[#F39C3D0D] glow-primary"
              : "border-border bg-card-inner"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={comment.user.avatarUrl ?? undefined} alt={comment.user.username ?? ""} />
              <AvatarFallback className="text-xs">
                {(comment.user.username ?? comment.user.fullName)?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/profile/${comment.user.id}`}
                  className="text-body-sm font-semibold text-foreground hover:underline"
                >
                  @{comment.user.username ?? comment.user.fullName}
                </Link>
                {roleBadge && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-badge"
                    style={{ backgroundColor: `${roleBadge.color}22`, color: roleBadge.color }}
                  >
                    {roleBadge.label}
                  </span>
                )}
                {pinned && (
                  <span
                    className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-badge"
                    style={{ backgroundColor: `${PINNED_COLOR}22`, color: PINNED_COLOR }}
                  >
                    <Star className="size-2.5" style={{ color: PINNED_STAR_COLOR }} /> Öne Çıkan
                  </span>
                )}
                {comment.status === "PENDING" && (
                  <span className="flex items-center gap-0.5 rounded-full bg-[#F39C3D22] px-1.5 py-0.5 text-badge text-[#F39C3D]">
                    <Clock className="size-2.5" /> ONAY BEKLİYOR
                  </span>
                )}
              </div>
              <p className="flex items-center gap-1 text-body-xs text-muted-foreground">
                {timeAgo(comment.createdAt)}
                {comment.editedAt && (
                  <>
                    {" · "}
                    <button
                      type="button"
                      onClick={() => setShowHistory((s) => !s)}
                      className="underline decoration-dotted hover:text-foreground"
                    >
                      düzenlendi
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
          {(isAuthor || canDelete) && (
            <div className="flex shrink-0 items-center gap-1">
              {isAuthor && !editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditValue(comment.content);
                    setEditing(true);
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
                  aria-label="Yorumu düzenle"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(comment.id)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-[#EF444422] hover:text-[#EF4444]"
                  aria-label="Yorumu sil"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={3}
              autoFocus
              className="w-full resize-none rounded-lg border border-border bg-card p-2.5 text-body-sm text-foreground focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg px-3 py-1.5 text-body-xs text-muted-foreground hover:bg-accent"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editComment.isPending || !editValue.trim()}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                Kaydet
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-body-sm text-foreground">{renderContent(comment.content)}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-4">
          {isTopLevel && comment.status === "APPROVED" && <ReactionButtons comment={comment} onReact={onReact} />}
          {isTopLevel && comment.status === "APPROVED" && (
            <button
              type="button"
              onClick={() => setReplying((r) => !r)}
              className="flex items-center gap-1 text-body-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              <CornerDownRight className="size-3.5" /> Cevapla
            </button>
          )}
          {comment.status === "APPROVED" && comment.user.role === "STUDENT" && (
            <button
              type="button"
              onClick={() => setReporting(true)}
              className="flex items-center gap-1 text-body-xs text-muted-foreground transition-colors duration-200 hover:text-[#EF4444]"
            >
              <Flag className="size-3.5" /> Şikayet Et
            </button>
          )}
        </div>
      </div>

      {showHistory && comment.edits.length > 0 && (
        <CommentEditHistoryDialog edits={comment.edits} onClose={() => setShowHistory(false)} />
      )}

      {reporting && <CommentReportDialog commentId={comment.id} onClose={() => setReporting(false)} />}

      {replying && (
        <div className="ml-6">
          <Composer
            placeholder="Cevabınızı yazın..."
            autoFocus
            compact
            onSubmit={async (content) => {
              await createComment.mutateAsync({ content, parentId: comment.id });
              setReplying(false);
              toast.success(
                me?.role === "STUDENT" ? "Cevabınız onay için gönderildi" : "Cevabınız yayınlandı",
              );
            }}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="ml-6 space-y-2 border-l-2 border-border pl-4">
          {!showAllReplies && comment.replies.length > 1 && (
            <button
              type="button"
              onClick={() => setShowAllReplies(true)}
              className="text-body-xs text-primary hover:underline"
            >
              Tüm cevapları görüntülemek için tıklayın ({comment.replies.length})
            </button>
          )}
          {visibleReplies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              lessonId={lessonId}
              isTopLevel={false}
              onReact={onReact}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({ lessonId }: { lessonId: string }) {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useLessonComments(lessonId, page);
  const createComment = useCreateComment(lessonId);
  const reactMutation = useReactToComment(lessonId);
  const deleteMutation = useDeleteComment(lessonId);

  function handleReact(commentId: string, type: "LIKE" | "DISLIKE") {
    reactMutation.mutate({ commentId, type });
  }

  function handleDelete(commentId: string) {
    if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;
    deleteMutation.mutate(commentId);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="flex items-center gap-2 text-card-title-sm text-foreground">
        <MessageSquare className="size-4" /> Yorumlar {data && `(${data.pagination.total})`}
      </h3>

      <div className="mt-4">
        {data?.suspendedMessage ? (
          <div className="flex items-start gap-2 rounded-xl border border-[#EF444440] bg-[#EF444411] p-3 text-body-xs text-[#EF4444]">
            <ShieldAlert className="size-4 shrink-0" />
            <span>
              {data.suspendedMessage}{" "}
              <Link href="/support" className="font-semibold underline">
                Destek sayfasına git
              </Link>
            </span>
          </div>
        ) : (
          <Composer
            placeholder="Sadece kullanıcı adıyla (@kullaniciadi) birbirinizi etiketleyebilirsiniz"
            onSubmit={async (content) => {
              await createComment.mutateAsync({ content });
              toast.success(
                me?.role === "STUDENT" ? "Yorumunuz onay için gönderildi" : "Yorumunuz yayınlandı",
              );
            }}
          />
        )}
      </div>

      {isLoading && <p className="mt-4 text-body-sm text-muted-foreground">Yükleniyor...</p>}

      {data && (
        <div className="mt-5 space-y-4">
          {data.myPending.length > 0 && (
            <div className="space-y-2">
              {data.myPending.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  lessonId={lessonId}
                  isTopLevel={!c.parentId}
                  onReact={handleReact}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {data.pinned.length > 0 && (
            <div className="space-y-2">
              {data.pinned.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  lessonId={lessonId}
                  isTopLevel
                  pinned
                  onReact={handleReact}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {data.comments.length === 0 && data.pinned.length === 0 && data.myPending.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">Henüz yorum yok. İlk yorumu siz yazın.</p>
          ) : (
            <div className="space-y-2">
              {data.comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  lessonId={lessonId}
                  isTopLevel
                  onReact={handleReact}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {data.pagination.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
              {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`size-8 rounded-lg text-xs font-medium transition-colors duration-200 ${
                    p === page
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
