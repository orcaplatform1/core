import { PageHero } from "@/components/marketing/page-hero";
import { TechStackGrid } from "@/components/marketing/tech-stack-grid";
import { getSiteContent } from "@/lib/marketing/get-site-content";

export default async function EnhancersPage() {
  const siteContent = await getSiteContent();

  return (
    <>
      <PageHero title="ORCA'nın Gücünü Oluşturan Teknolojiler" heroImageSrc={siteContent.heroImageUrl ?? undefined} />
      <TechStackGrid />
    </>
  );
}
