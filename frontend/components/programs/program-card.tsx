import Link from "next/link";
import { Clock } from "lucide-react";
import type { Program } from "@/lib/types/curriculum";
import { LevelBadge } from "./level-badge";

export function ProgramCard({ program }: { program: Program }) {
  return (
    <Link
      href={`/programs/${program.id}`}
      data-level={program.level ?? undefined}
      className="program-card-accent group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-primary/20 via-card to-purple/10">
        {program.order > 0 && (
          <span className="text-badge absolute left-3 top-3 z-10 rounded-lg bg-background/70 px-2 py-1 text-foreground backdrop-blur-sm">
            {String(program.order).padStart(2, "0")}
          </span>
        )}
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
            <span className="text-body-xs flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3.5" />
              {program.durationHours} saat
            </span>
          )}
        </div>
        <h3 className="text-card-title-sm text-foreground">{program.title}</h3>
        {program.description && (
          <p className="line-clamp-2 text-body-sm text-muted-foreground">{program.description}</p>
        )}
      </div>
    </Link>
  );
}
