"use client";

import { usePrograms } from "@/lib/hooks/use-curriculum";
import { ProgramCard } from "@/components/programs/program-card";

export function ProgramsContent() {
  const { data: programs, isLoading } = usePrograms();

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
      <p className="mb-10 text-body-sm text-muted-foreground">
        Finans ve trading dünyasında ustalaşmak için tasarlanmış eğitim programları.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : !programs || programs.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">Henüz yayınlanmış bir program yok.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}
    </div>
  );
}
