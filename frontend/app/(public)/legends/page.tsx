import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { LegendsList } from "@/components/legends/legends-list";
import { getSiteContent } from "@/lib/marketing/get-site-content";

export const metadata: Metadata = {
  title: "En İyiler",
  description: "Tarihin en iyi 20 yatırımcısı ve traderı - nasıl başladıkları, nasıl başardıkları.",
};

export default async function LegendsPage() {
  const siteContent = await getSiteContent();

  return (
    <>
      <PageHero title="En İyiler" heroImageSrc={siteContent.heroImageUrl ?? undefined} />
      <LegendsList />
    </>
  );
}
