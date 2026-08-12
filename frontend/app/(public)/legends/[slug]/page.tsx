import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { LEGENDS, getLegend } from "@/lib/data/legends";
import { LegendAvatar } from "@/components/legends/legend-avatar";

export function generateStaticParams() {
  return LEGENDS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const legend = getLegend(slug);
  if (!legend) return {};
  return {
    title: `${legend.name} - En İyiler`,
    description: legend.bio.slice(0, 155),
  };
}

export default async function LegendDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const legend = getLegend(slug);
  if (!legend) notFound();

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: legend.name,
    description: legend.bio.slice(0, 300),
    image: legend.photoUrl ?? undefined,
    url: `https://traders.tr/core/legends/${legend.slug}`,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "En İyiler", item: "https://traders.tr/core/legends" },
      { "@type": "ListItem", position: 2, name: legend.name, item: `https://traders.tr/core/legends/${legend.slug}` },
    ],
  };

  return (
    <div className="mx-auto max-w-[720px] px-4 py-14 sm:px-6">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Link
        href="/legends"
        className="mb-8 inline-flex items-center gap-1.5 text-body-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> En İyiler
      </Link>

      <div className="premium-glow-card flex flex-col items-center gap-4 bg-card p-8 text-center sm:p-10">
        <LegendAvatar name={legend.name} photoUrl={legend.photoUrl} size="lg" />
        <h1 className="text-h1 text-foreground">{legend.name}</h1>
      </div>

      <div className="mt-8">
        <h2 className="text-h2 text-foreground">Hikayesi</h2>
        <p className="mt-4 whitespace-pre-wrap text-body text-muted-foreground">{legend.bio}</p>
        {legend.photoUrl && legend.photoLicense && (
          <p className="mt-8 text-body-xs text-muted-foreground/70">
            Fotoğraf: Wikimedia Commons ({legend.photoLicense})
          </p>
        )}
      </div>
    </div>
  );
}
