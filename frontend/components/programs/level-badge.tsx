import type { ProgramLevel } from "@/lib/types/curriculum";
import { cn } from "@/lib/utils";

const labels: Record<ProgramLevel, string> = {
  BASLANGIC: "Başlangıç",
  ORTA: "Orta",
  ILERI: "İleri",
};

const colors: Record<ProgramLevel, string> = {
  BASLANGIC: "bg-success/10 text-success",
  ORTA: "bg-warning/10 text-warning",
  ILERI: "bg-danger/10 text-danger",
};

export function LevelBadge({ level }: { level: ProgramLevel | null }) {
  if (!level) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold",
        colors[level]
      )}
    >
      {labels[level]}
    </span>
  );
}
