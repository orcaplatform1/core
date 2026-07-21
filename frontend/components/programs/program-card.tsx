import Link from "next/link";
import { Clock } from "lucide-react";
import type { Program } from "@/lib/types/curriculum";
import { LevelBadge } from "./level-badge";

export function ProgramCard({ program }: { program: Program }) {
  return (
    <Link
      href={`/programs/${program.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-primary/20 via-card to-purple/10">
        {program.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={program.coverImageUrl}
            alt={program.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <LevelBadge level={program.level} />
          {program.durationHours && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {program.durationHours} saat
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold text-foreground">{program.title}</h3>
        {program.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{program.description}</p>
        )}
      </div>
    </Link>
  );
}
