import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Program, ProgramLevel } from "@/lib/types/curriculum";
import { ProgramCard } from "@/components/programs/program-card";

const LEVEL_ORDER: Record<ProgramLevel, number> = {
  BASLANGIC: 0,
  ORTA: 1,
  ILERI: 2,
};

export function ExpertisePrograms({
  programs,
  featuredProgramIds,
}: {
  programs: Program[];
  featuredProgramIds: string[];
}) {
  const curated = featuredProgramIds
    .map((id) => programs.find((p) => p.id === id))
    .filter((p): p is Program => Boolean(p))
    .sort((a, b) => (a.level ? LEVEL_ORDER[a.level] : 99) - (b.level ? LEVEL_ORDER[b.level] : 99));

  if (curated.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Uzman Kadro, Sistematik Eğitim</p>
          <h2 className="mt-2 text-3xl font-bold text-foreground">Uzmanlık Programlarımız</h2>
        </div>
        <Link href="/programs" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          Tüm Programları Gör <ArrowRight className="size-4" />
        </Link>
      </div>

      <div
        className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8
          [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border
          [&::-webkit-scrollbar-track]:bg-transparent"
      >
        <div className="flex snap-x snap-mandatory gap-4">
          {curated.map((program) => (
            <div key={program.id} className="w-[260px] shrink-0 snap-start sm:w-[290px]">
              <ProgramCard program={program} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
