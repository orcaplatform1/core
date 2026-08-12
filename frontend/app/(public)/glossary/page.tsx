import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { GlossaryContent } from "@/components/glossary/glossary-content";
import { getSiteContent } from "@/lib/marketing/get-site-content";

export const metadata: Metadata = {
  title: "Sözlük",
  description: "Kripto, borsa ve forex dünyasının tüm terim ve kavramları tek sayfada.",
};

export default async function GlossaryPage() {
  const siteContent = await getSiteContent();

  return (
    <>
      <PageHero title="Sözlük" heroImageSrc={siteContent.heroImageUrl ?? undefined} />
      <GlossaryContent />
    </>
  );
}
