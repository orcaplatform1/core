import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Layers } from "lucide-react";
import { getProgramBySlugOrId, getAllModules, getAllLessons } from "@/lib/marketing/get-programs";
import { LevelBadge } from "@/components/programs/level-badge";
import { ProgramCurriculum } from "@/components/programs/program-curriculum";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgramBySlugOrId(slug);
  if (!program) return {};
  return {
    title: program.title,
    description: program.description ?? undefined,
    openGraph: program.coverImageUrl
      ? { images: [{ url: program.coverImageUrl, width: 1200, height: 630, alt: program.title }] }
      : undefined,
  };
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [program, allModules, allLessons] = await Promise.all([
    getProgramBySlugOrId(slug),
    getAllModules(),
    getAllLessons(),
  ]);

  if (!program) notFound();

  const modules = allModules.filter((m) => m.programId === program.id).sort((a, b) => a.order - b.order);
  const lessons = allLessons.filter((l) => modules.some((m) => m.id === l.moduleId));

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: program.title,
    description: program.description ?? undefined,
    provider: { "@type": "Organization", name: "ORCA", sameAs: "https://traders.tr/core" },
    ...(program.durationHours
      ? {
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "online",
            courseWorkload: `PT${program.durationHours}H`,
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-16 sm:px-6">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      {program.coverImageUrl && (
        <div className="mb-8 h-48 w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/20 via-card to-purple/10 sm:h-64">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={program.coverImageUrl}
            alt={program.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex flex-col gap-4">
        <LevelBadge level={program.level} />
        <h1 className="text-h1 text-foreground">{program.title}</h1>
        {program.description && (
          <p className="text-body text-muted-foreground">{program.description}</p>
        )}
        <div className="flex items-center gap-5 text-body-sm text-muted-foreground">
          {program.durationHours && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" /> {program.durationHours} saat
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Layers className="size-4" /> {modules.length} modül
          </span>
        </div>

        <ProgramCurriculum program={program} modules={modules} lessons={lessons} />
      </div>
    </div>
  );
}
