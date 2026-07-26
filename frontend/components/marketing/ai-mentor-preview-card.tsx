import { Bot, ArrowRight, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const waveform = [30, 55, 40, 80, 60, 90, 45, 70, 35, 60, 50, 85, 40, 65, 30];

export function AiMentorPreviewCard({
  size = "compact",
  className,
}: {
  size?: "compact" | "expanded";
  className?: string;
}) {
  const expanded = size === "expanded";

  return (
    <Card
      variant="glass"
      className={cn("gap-4 p-5", expanded ? "w-full" : "w-full max-w-[420px]", className)}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Bot className="size-3.5" />
          </span>
          ORCA AI Mentor
        </span>
        <span className="flex items-center gap-1.5 text-xs text-success">
          <span className="size-1.5 animate-pulse rounded-full bg-success" />
          Online
        </span>
      </div>

      <div className="space-y-2">
        <div className="card-inner rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-foreground/90">
          Bugün Bitcoin&apos;de likidite bölgeleri hangi seviyelerde?
        </div>
        <div className="rounded-2xl rounded-tl-sm border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-foreground/90">
          Likidite haritasına göre 68.200 – 68.800 bölgesi kritik. Bu bölge üzerinde kalıcılık gelirse 70.200 hedeflenebilir.
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowRight className="size-3.5 text-primary" />
        ORCA düşünüyor...
      </div>

      <div className="flex h-8 items-end gap-[3px]">
        {waveform.map((h, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-primary/70"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      <div className="card-inner flex items-center gap-2 rounded-xl px-3 py-2">
        <span className="flex-1 text-xs text-muted-foreground">Bir soru sor...</span>
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <Send className="size-3" />
        </span>
      </div>
    </Card>
  );
}
