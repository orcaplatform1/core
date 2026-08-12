"use client";

import Link from "next/link";
import { Lock, PlayCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useMyEnrollments } from "@/lib/hooks/use-curriculum";
import { Button } from "@/components/ui/button";
import { PremiumGlowButton } from "@/components/ui/premium-glow-button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Program, CourseModule, LessonSummary } from "@/lib/types/curriculum";

// Program, modul ve dersler artik ust seviye server component'te (SEO icin
// server-side) fetch edilip prop olarak buraya geciyor - bu bilesen sadece
// giris/kayit durumuna gore degisen etkilesimli kismi (CTA, kilit ikonlari,
// ders linki vs. duz metin) client tarafinda yonetiyor.
export function ProgramCurriculum({
  program,
  modules,
  lessons,
}: {
  program: Program;
  modules: CourseModule[];
  lessons: LessonSummary[];
}) {
  const { user } = useAuth();
  const { data: enrollments } = useMyEnrollments();

  const isEnrolled = !!enrollments?.some((e) => e.programId === program.id) || user?.role === "SUPER_ADMIN";

  return (
    <>
      {isEnrolled ? (
        <Button
          className="mt-2 h-12 w-fit"
          render={<Link href={`/courses/${program.id}`}>Eğitime Devam Et</Link>}
        />
      ) : user ? (
        <PremiumGlowButton
          wrapperClassName="mt-2"
          className="h-12 w-fit"
          render={<Link href="/subscription">Programı Satın Al</Link>}
        />
      ) : (
        <Button className="mt-2 h-12 w-fit" render={<Link href="/login">Satın Almak İçin Giriş Yap</Link>} />
      )}

      <div className="mt-12">
        <h2 className="text-h2 text-foreground">Müfredat</h2>
        {modules.length === 0 ? (
          <p className="mt-4 text-body-sm text-muted-foreground">Müfredat yakında eklenecek.</p>
        ) : (
          <Accordion multiple={false} className="mt-4 flex flex-col gap-3">
            {modules.map((mod, i) => {
              const moduleLessons = lessons
                .filter((l) => l.moduleId === mod.id)
                .sort((a, b) => a.order - b.order);
              return (
                <AccordionItem
                  key={mod.id}
                  value={mod.id}
                  className="rounded-xl border border-border bg-card px-4"
                >
                  <AccordionTrigger className="py-4 hover:no-underline">
                    <div className="flex flex-1 items-center gap-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-card-title-sm text-primary">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-card-title-sm text-foreground">{mod.title}</p>
                        {mod.description && (
                          <p className="truncate text-body-xs text-muted-foreground">{mod.description}</p>
                        )}
                      </div>
                      {!isEnrolled && <Lock className="size-4 shrink-0 text-muted-foreground" />}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-1 pb-2 pl-13">
                      {moduleLessons.length === 0 && (
                        <p className="text-body-xs text-muted-foreground">Bu modülde henüz ders yok.</p>
                      )}
                      {moduleLessons.map((lesson) =>
                        user ? (
                          <Link
                            key={lesson.id}
                            href={`/courses/${program.id}/lessons/${lesson.id}`}
                            className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-body-sm text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
                          >
                            <PlayCircle className="size-4 shrink-0" />
                            {lesson.title}
                          </Link>
                        ) : (
                          <span
                            key={lesson.id}
                            className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-body-sm text-muted-foreground"
                          >
                            <PlayCircle className="size-4 shrink-0" />
                            {lesson.title}
                          </span>
                        )
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </>
  );
}
