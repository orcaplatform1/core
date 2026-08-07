"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useSendMentorMessage } from "@/lib/hooks/use-mentor";
import { ApiError } from "@/lib/api-client";

type ChatEntry = { role: "user" | "assistant"; content: string };

export function AiMentorPreviewCard({
  size = "compact",
  premium = false,
  className,
}: {
  size?: "compact" | "expanded";
  /** Ana sayfa hero'sundaki kutu için: dönen premium gradient çerçeve, transparan
   *  arka plan, mor glow kaldırılmış. Navbar önizleme dropdown'u gibi diğer
   *  kullanımlar bu prop'u geçmeyip mevcut cam-kart görünümünü korur. */
  premium?: boolean;
  className?: string;
}) {
  const expanded = size === "expanded";
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const sendMessage = useSendMentorMessage();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatEntry[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sendMessage.isPending || authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");

    try {
      const res = await sendMessage.mutateAsync({ content });
      setMessages((m) => [...m, { role: "assistant", content: res.message.content }]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Bir hata oluştu, lütfen tekrar dene.";
      setMessages((m) => [...m, { role: "assistant", content: message }]);
    }
  }

  return (
    <div
      className={cn(
        "relative",
        expanded ? "w-full" : "w-full max-w-[420px]",
        premium && "premium-glow-card",
        className
      )}
    >
      {/* Katmanlı derinlik: kartın arkasında yumuşak mor bir parıltı — düz mavi temadan
          ayrışan "premium" his için, göz yormaması adına düşük opasitede.
          premium modda (dönen gradient çerçeve) bu statik mor glow kaldırılır. */}
      {!premium && (
        <div className="pointer-events-none absolute -inset-3 rounded-[28px] bg-purple/10 opacity-40 blur-2xl" />
      )}

      <Card
        variant="glass"
        className={cn(
          "relative gap-4 overflow-hidden p-5",
          premium
            ? "border-transparent bg-background shadow-none backdrop-blur-none"
            : "border-purple/25 bg-gradient-to-b from-purple/[0.08] via-[var(--glass-bg)] to-[var(--glass-bg)] shadow-[0_24px_60px_-20px_rgba(139,92,246,0.25)]"
        )}
      >
        {/* İç üst kenar aydınlatması — cam katmanına ince bir "highlight" çizgisi */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple/50 to-transparent" />

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-card-title-sm text-foreground">
            <span className="flex size-6 items-center justify-center rounded-full bg-purple/20 text-purple">
              <Bot className="size-3.5" />
            </span>
            ORCA AI Mentor
          </span>
          <span className="flex items-center gap-1.5 text-body-xs text-success">
            <span className="size-1.5 animate-pulse rounded-full bg-success" />
            Online
          </span>
        </div>

        <div className="max-h-56 space-y-2 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="card-inner rounded-2xl rounded-tl-sm px-3 py-2 text-body-xs text-muted-foreground">
              Kişiselleştirilmiş eğitim planın için bana biraz bilgi vermeni istiyorum.
            </div>
          ) : (
            messages.map((m, i) =>
              m.role === "user" ? (
                <div
                  key={i}
                  className="rounded-2xl rounded-tl-sm border border-purple/25 bg-purple/10 px-3 py-2 text-body-xs text-foreground/90"
                >
                  {m.content}
                </div>
              ) : (
                <div key={i} className="card-inner rounded-2xl rounded-tl-sm px-3 py-2 text-body-xs text-foreground/90">
                  {m.content}
                </div>
              )
            )
          )}
          {sendMessage.isPending && (
            <div className="flex items-center gap-2 text-body-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin text-purple" />
              ORCA düşünüyor...
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="card-inner flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 transition-colors duration-200 focus-within:border-purple/30"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={user ? "" : "Mentor kullanmak için giriş yap..."}
            className="flex-1 bg-transparent text-body-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={sendMessage.isPending || !input.trim()}
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-purple text-white shadow-[0_4px_16px_-4px_rgba(139,92,246,0.7)] transition-opacity disabled:opacity-40"
            aria-label="Gönder"
          >
            <Send className="size-3" />
          </button>
        </form>
      </Card>
    </div>
  );
}
