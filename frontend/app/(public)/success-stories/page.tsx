import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/marketing/page-hero";
import { SuccessStoriesContent } from "@/components/marketing/success-stories-content";
import { getSiteContent } from "@/lib/marketing/get-site-content";

export const metadata: Metadata = {
  title: "Başarı Hikayeleri",
  description: "ORCA'yı bitiren öğrencilerin kendi ağızlarından anlattığı başarı hikayeleri.",
};

export default async function SuccessStoriesPage() {
  const siteContent = await getSiteContent();

  return (
    <>
      <PageHero title="Başarı Hikayeleri" heroImageSrc={siteContent.heroImageUrl ?? undefined} />
      <Suspense fallback={null}>
        <SuccessStoriesContent />
      </Suspense>
    </>
  );
}
