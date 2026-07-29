import { PageHero } from "@/components/marketing/page-hero";
import { ProgramsContent } from "@/components/programs/programs-content";
import { getSiteContent } from "@/lib/marketing/get-site-content";

export default async function ProgramsPage() {
  const siteContent = await getSiteContent();

  return (
    <>
      <PageHero title="Programlar" heroImageSrc={siteContent.heroImageUrl ?? undefined} />
      <ProgramsContent />
    </>
  );
}
