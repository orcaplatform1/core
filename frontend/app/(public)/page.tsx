import { MessageSquare } from "lucide-react";
import { Hero } from "@/components/marketing/hero";
import { PartnersBar } from "@/components/marketing/partners-bar";
import { PlatformShowcase } from "@/components/marketing/platform-showcase";
import { ExpertisePrograms } from "@/components/marketing/expertise-programs";
import { ToolsShowcase } from "@/components/marketing/tools-showcase";
import { CommunityStats, type CommunityStatItem } from "@/components/marketing/community-stats";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { resolveIcon } from "@/lib/marketing/icon-registry";
import { getSiteContent } from "@/lib/marketing/get-site-content";
import { getPrograms } from "@/lib/marketing/get-programs";

export default async function Home() {
  const [siteContent, programs] = await Promise.all([getSiteContent(), getPrograms()]);

  const communityStats: CommunityStatItem[] = siteContent.communityStats.map((c) => ({
    icon: resolveIcon(c.icon),
    value: c.value,
    label: c.label,
  }));

  return (
    <>
      <Hero
        badge={siteContent.heroBadge ?? undefined}
        title={siteContent.heroTitle}
        description={siteContent.heroDescription}
        primaryCta={{ label: siteContent.heroPrimaryCtaLabel, href: siteContent.heroPrimaryCtaHref }}
        secondaryCta={
          siteContent.heroSecondaryCtaLabel && siteContent.heroSecondaryCtaHref
            ? { label: siteContent.heroSecondaryCtaLabel, href: siteContent.heroSecondaryCtaHref }
            : undefined
        }
        heroImageSrc={siteContent.heroImageUrl ?? undefined}
      />

      <PartnersBar title={siteContent.partnersTitle} partners={siteContent.partnersItems} />

      <PlatformShowcase data={siteContent.platformShowcase} />

      <ExpertisePrograms programs={programs} featuredProgramIds={siteContent.featuredProgramIds} />

      <ToolsShowcase title={siteContent.toolsTitle} subtitle={siteContent.toolsSubtitle} tools={siteContent.toolsItems} />

      <CommunityStats
        title={siteContent.communityTitle}
        stats={communityStats}
        extraCount={siteContent.communityExtraCount ?? undefined}
      />

      <CtaBanner
        icon={MessageSquare}
        title={siteContent.ctaTitle}
        description={siteContent.ctaDescription ?? undefined}
        checklist={siteContent.ctaChecklist}
        ctaLabel={siteContent.ctaButtonLabel}
        ctaHref={siteContent.ctaButtonHref}
        accent="purple"
      />
    </>
  );
}
