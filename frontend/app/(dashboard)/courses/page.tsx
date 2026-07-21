"use client";

import Link from "next/link";
import { useMyEnrollments, usePrograms } from "@/lib/hooks/use-curriculum";
import { ProgramCard } from "@/components/programs/program-card";
import { Button } from "@/components/ui/button";

export default function CoursesPage() {
  const { data: enrollments, isLoading: loadingEnrollments } = useMyEnrollments();
  const { data: allPrograms, isLoading: loadingPrograms } = usePrograms();

  const isLoading = loadingEnrollments || loadingPrograms;
  const myPrograms = (allPrograms ?? []).filter((p) =>
    enrollments?.some((e) => e.programId === p.id)
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Eğitimlerim</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sahip olduğun programlar ve kaldığın yerden devam et.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : myPrograms.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Henüz bir programa sahip değilsin.
          </p>
          <Button className="mt-4 h-11" render={<Link href="/programs">Programları İncele</Link>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myPrograms.map((program) => (
            <Link
              key={program.id}
              href={`/courses/${program.id}`}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="h-32 w-full bg-gradient-to-br from-primary/20 via-card to-purple/10" />
              <div className="p-5">
                <h3 className="text-base font-semibold text-foreground">{program.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Devam etmek için tıkla</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
