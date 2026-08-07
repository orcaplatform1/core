"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCommunityComments, useAddCommunityComment } from "@/lib/hooks/use-community";

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

export function PostComments({ postId, canInteract }: { postId: string; canInteract: boolean }) {
  const router = useRouter();
  const { data, isLoading } = useCommunityComments(postId, 1, true);
  const addComment = useAddCommunityComment(postId);
  const [text, setText] = useState("");

  async function submit() {
    if (!canInteract) {
      router.push("/subscription");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await addComment.mutateAsync(trimmed);
      setText("");
    } catch (err: any) {
      toast.error(err?.message ?? "Yorum gönderilemedi");
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-divider pt-3">
      {isLoading ? (
        <p className="text-body-xs text-muted-foreground">Yükleniyor...</p>
      ) : !data || data.data.length === 0 ? (
        <p className="text-body-xs text-muted-foreground">Henüz yorum yok.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.data.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar size="sm">
                <AvatarImage src={c.user.avatarUrl ?? undefined} alt={c.user.username ?? ""} />
                <AvatarFallback className="text-[10px]">
                  {(c.user.username ?? c.user.fullName)?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 rounded-xl border border-border bg-card-inner px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Link href={`/profile/${c.user.id}`} className="text-card-title-sm text-foreground hover:underline">
                    @{c.user.username ?? c.user.fullName}
                  </Link>
                  <span className="text-body-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-body-xs text-foreground">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={canInteract ? "Yorum yaz..." : "Yorum yazmak için satın alın"}
          className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-input text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-ring"
        />
        <button
          type="button"
          onClick={submit}
          disabled={addComment.isPending}
          aria-label="Yorumu gönder"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
        >
          {!canInteract ? <Lock className="size-3.5" /> : <Send className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}
