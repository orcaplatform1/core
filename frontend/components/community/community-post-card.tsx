"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThumbsUp, ThumbsDown, MessageSquare, Flag, Lock, TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  type CommunityPost,
  COMMUNITY_POST_DISCLAIMER,
  useReactToCommunityPost,
  useReportCommunityPost,
} from "@/lib/hooks/use-community";
import { PostComments } from "./post-comments";

const DIRECTION_META: Record<CommunityPost["direction"], { label: string; icon: typeof TrendingUp; className: string }> = {
  LONG: { label: "Long", icon: TrendingUp, className: "bg-success/10 text-success" },
  SHORT: { label: "Short", icon: TrendingDown, className: "bg-danger/10 text-danger" },
  NEUTRAL: { label: "Nötr", icon: Minus, className: "bg-muted text-muted-foreground" },
};

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

function ReportDialog({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const report = useReportCommunityPost();

  async function submit() {
    if (!reason.trim()) return;
    try {
      await report.mutateAsync({ postId, reason: reason.trim() });
      toast.success("Şikayetiniz iletildi");
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Şikayet gönderilemedi");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Flag className="size-4 text-danger" /> Paylaşımı Şikayet Et
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Bu paylaşımın topluluk kurallarını neden ihlal ettiğini kısaca açıklayın.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Şikayet sebebi..."
          className="mt-3 w-full resize-none rounded-lg border border-border bg-card-inner p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">
            Vazgeç
          </button>
          <button
            onClick={submit}
            disabled={report.isPending || !reason.trim()}
            className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Şikayet Et
          </button>
        </div>
      </div>
    </div>
  );
}

export function CommunityPostCard({
  post,
  canInteract,
  featured = false,
  highlighted = false,
}: {
  post: CommunityPost;
  canInteract: boolean;
  featured?: boolean;
  highlighted?: boolean;
}) {
  const router = useRouter();
  const react = useReactToCommunityPost();
  const [reporting, setReporting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const direction = DIRECTION_META[post.direction];
  const DirectionIcon = direction.icon;

  function guarded(action: () => void) {
    if (!canInteract) {
      router.push("/subscription");
      return;
    }
    action();
  }

  async function handleReact(type: "LIKE" | "DISLIKE") {
    try {
      await react.mutateAsync({ postId: post.id, type });
    } catch (err: any) {
      toast.error(err?.message ?? "İşlem başarısız");
    }
  }

  return (
    <div
      id={`community-post-${post.id}`}
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow duration-300 ${
        featured
          ? "border-primary/50 shadow-[0_0_0_1px_rgba(59,91,255,0.25),0_0_32px_rgba(59,91,255,0.18)]"
          : "border-border"
      } ${highlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
    >
      {featured && (
        <div className="absolute left-0 top-0 z-10 flex items-center gap-1 rounded-br-xl bg-purple px-3 py-1.5 text-xs font-semibold text-white">
          <Trophy className="size-3.5" />
          Haftanın Setup&apos;ı
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={post.imageUrl} alt={post.title} className={featured ? "h-72 w-full object-cover" : "h-56 w-full object-cover"} />

      <div className={featured ? "flex flex-col gap-3 p-6" : "flex flex-col gap-3 p-5"}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar size="sm">
              <AvatarImage src={post.user.avatarUrl ?? undefined} alt={post.user.username ?? ""} />
              <AvatarFallback className="text-xs">
                {(post.user.username ?? post.user.fullName)?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/profile/${post.user.id}`}
                  className="block truncate text-sm font-semibold text-foreground hover:underline"
                >
                  @{post.user.username ?? post.user.fullName}
                </Link>
                {post.user.isFoundingMember && (
                  <span className="shrink-0 rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-semibold text-warning">
                    Kurucu Üye
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">{timeAgo(post.createdAt)}</p>
            </div>
          </div>
          <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${direction.className}`}>
            <DirectionIcon className="size-3.5" />
            {direction.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">{post.symbol}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{post.timeframe}</span>
          {post.ictTags.map((tag) => (
            <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>

        <div>
          <h3 className={featured ? "text-lg font-semibold text-foreground" : "text-base font-semibold text-foreground"}>
            {post.title}
          </h3>
          {post.description && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{post.description}</p>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-divider pt-3">
          <button
            type="button"
            onClick={() => guarded(() => handleReact("LIKE"))}
            className={`flex items-center gap-1 text-xs transition-colors duration-200 ${
              post.myReaction === "LIKE" ? "text-success" : "text-muted-foreground hover:text-success"
            }`}
          >
            {!canInteract ? <Lock className="size-3.5" /> : <ThumbsUp className="size-3.5" />}
            {post.likes}
          </button>
          <button
            type="button"
            onClick={() => guarded(() => handleReact("DISLIKE"))}
            className={`flex items-center gap-1 text-xs transition-colors duration-200 ${
              post.myReaction === "DISLIKE" ? "text-danger" : "text-muted-foreground hover:text-danger"
            }`}
          >
            {!canInteract ? <Lock className="size-3.5" /> : <ThumbsDown className="size-3.5" />}
            {post.dislikes}
          </button>
          <button
            type="button"
            onClick={() => setShowComments((s) => !s)}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <MessageSquare className="size-3.5" />
            {post.commentsCount}
          </button>
          <button
            type="button"
            onClick={() => guarded(() => setReporting(true))}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-danger"
          >
            {!canInteract ? <Lock className="size-3.5" /> : <Flag className="size-3.5" />}
            Şikayet Et
          </button>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">{COMMUNITY_POST_DISCLAIMER}</p>

        {showComments && <PostComments postId={post.id} canInteract={canInteract} />}
      </div>

      {reporting && <ReportDialog postId={post.id} onClose={() => setReporting(false)} />}
    </div>
  );
}
