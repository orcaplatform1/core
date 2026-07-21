"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bot, Send, Sparkles, CreditCard } from "lucide-react";
import {
  useMentorHistory,
  useMentorQuota,
  useSendMentorMessage,
} from "@/lib/hooks/use-mentor";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MentorPage() {
  const { data: history, isLoading: loadingHistory } = useMentorHistory();
  const { data: quota } = useMentorQuota();
  const { mutate: sendMessage, isPending: sending } = useSendMentorMessage();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, sending]);

  const handleSend = () => {
    const content = input.trim();
    if (!content) return;
    setInput("");
    sendMessage(
      { content },
      {
        onError: (err) => {
          if (err instanceof ApiError && err.status === 402) {
            toast.error("Günlük ücretsiz hakkın doldu", {
              description: "Mentor Kredi satın alarak devam edebilirsin.",
            });
          } else {
            toast.error("Mesaj gönderilemedi, tekrar dene.");
          }
        },
      }
    );
  };

  const noQuota = quota && quota.freeRemaining <= 0 && quota.mentorCredits <= 0;

  return (
    <div className="flex h-[calc(100vh-72px-4rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Bot className="size-6 text-purple" /> Yapay Zeka Mentor
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Finans ve trading sorularını sor, kişisel yol haritanı oluştur.
          </p>
        </div>
        {quota && (
          <div className="card-inner flex items-center gap-3 rounded-xl px-4 py-2 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Bugün Kalan</p>
              <p className="text-sm font-semibold text-foreground">
                {quota.freeRemaining}/{quota.dailyFreeLimit} ücretsiz
              </p>
            </div>
            {quota.mentorCredits > 0 && (
              <span className="rounded-full bg-purple/15 px-2.5 py-1 text-xs font-medium text-purple">
                +{quota.mentorCredits} kredi
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-5">
          {loadingHistory ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 w-2/3 animate-pulse rounded-2xl bg-secondary" />
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <Sparkles className="size-8 text-purple" />
              <p className="text-sm text-muted-foreground">
                Merhaba! Finans, trading veya eğitim programınla ilgili aklına takılan
                herhangi bir şeyi sorabilirsin.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "USER"
                        ? "bg-primary text-primary-foreground"
                        : "card-inner text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="card-inner flex items-center gap-1.5 rounded-2xl px-4 py-2.5">
                    <span className="size-1.5 animate-bounce rounded-full bg-purple [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-purple [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-purple" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          {noQuota ? (
            <div className="flex items-center justify-between rounded-xl bg-warning/10 p-3">
              <span className="text-sm text-foreground">
                Günlük ücretsiz hakkın doldu.
              </span>
              <Button size="sm" render={<Link href="/mentor/credits"><CreditCard className="size-4" /> Kredi Al</Link>} />
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Bir soru sor..."
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={sending || !input.trim()} className="shrink-0">
                <Send className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
