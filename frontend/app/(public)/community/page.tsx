import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/marketing/page-hero";
import { CommunityContent } from "@/components/community/community-content";
import { VisitorTrialGate } from "@/components/layout/visitor-trial-gate";
import { getSiteContent } from "@/lib/marketing/get-site-content";

export const metadata: Metadata = {
  title: "Topluluk",
  description:
    "ORCA öğrencilerinin paylaştığı grafik analizlerini keşfet, kendi analizini paylaş, beğen ve yorum yap.",
};

export default async function CommunityPage() {
  const siteContent = await getSiteContent();

  return (
    <>
      <PageHero title="Topluluk" heroImageSrc={siteContent.heroImageUrl ?? undefined} />
      <VisitorTrialGate>
        <Suspense fallback={null}>
          <CommunityContent />
        </Suspense>
      </VisitorTrialGate>
    </>
  );
}
