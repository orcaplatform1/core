"use client";

import { Bot, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Bu panel su an sadece gorsel bir iskelet - gercek Claude API entegrasyonu
// yayina gecerken eklenecek (bkz. backend mentor.service.ts callAiMentor() stub'u).
// O yuzden /mentor/* endpoint'lerine hic istek atmiyor, sabit bir "yakinda" mesaji gosteriyor.
export function AiMentorSidebar({ lessonTitle }: { lessonTitle: string }) {
  return (
    <div className="flex h-[540px] flex-col rounded-2xl border border-border bg-card lg:sticky lg:top-20">
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
            <Bot className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Yapay Zeka Mentoru</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          Beta
        </Badge>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-dashed border-border bg-card-inner px-3 py-2 text-xs text-muted-foreground">
            Konuştuğun modül: <span className="font-medium text-foreground">{lessonTitle}</span>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-card-inner px-3.5 py-2.5 text-sm text-foreground">
              Merhaba! Bu ders hakkında sorularını yanıtlayabilmek için burada olacağım. Bu özellik çok
              yakında aktif olacak — hazır olduğunda buradan sorularını sorabileceksin. 🙂
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card-inner px-3 py-2 opacity-60">
          <input
            disabled
            placeholder="Yakında aktif olacak..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <Send className="size-4 shrink-0 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
