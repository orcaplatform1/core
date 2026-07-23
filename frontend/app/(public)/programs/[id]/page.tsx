"use client";

import { use } from "react";
import Link from "next/link";
import { Clock, Layers, Lock } from "lucide-react";
import { useProgram, useAllModules, useMyEnrollments } from "@/lib/hooks/use-curriculum";
import { useAuth } from "@/context/auth-context";
import { LevelBadge } from "@/components/programs/level-badge";
import { Button } from "@/components/ui/button";

export default function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: program, isLoading } = useProgram(id);
  const { data: allModules } = useAllModules();
  const { data: enrollments } = useMyEnrollments();

  const modules = (allModules ?? [])
    .filter((m) => m.programId === id)
    .sort((a, b) => a.order - b.order);

  const isEnrolled = !!enrollments?.some((e) => e.programId === id) || user?.role === "SUPER_ADMIN";

  if (isLoading || !program) {
    return (
      <div className="mx-auto max-w-[1000px] px-4 py-16">
        <div className="h-64 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-4">
        <LevelBadge level={program.level} />
        <h1 className="text-3xl font-bold text-foreground">{program.title}</h1>
        {program.description && (
          <p className="text-base text-muted-foreground">{program.description}</p>
        )}
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          {program.durationHours && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" /> {program.durationHours} saat
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Layers className="size-4" /> {modules.length} modül
          </span>
        </div>

        {isEnrolled ? (
          <Button
            className="mt-2 h-12 w-fit"
            render={<Link href={`/courses/${program.id}`}>Eğitime Devam Et</Link>}
          />
        ) : user ? (
          <Button disabled className="mt-2 h-12 w-fit" title="Ödeme sistemi yakında ekleniyor">
            Programı Satın Al (Yakında)
          </Button>
        ) : (
          <Button className="mt-2 h-12 w-fit" render={<Link href="/login">Satın Almak İçin Giriş Yap</Link>} />
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-foreground">Müfredat</h2>
        <div className="mt-4 flex flex-col gap-3">
          {modules.length === 0 && (
            <p className="text-sm text-muted-foreground">Müfredat yakında eklenecek.</p>
          )}
          {modules.map((mod, i) => (
            <div
              key={mod.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{mod.title}</p>
                {mod.description && (
                  <p className="truncate text-xs text-muted-foreground">{mod.description}</p>
                )}
              </div>
              {!isEnrolled && <Lock className="size-4 shrink-0 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
