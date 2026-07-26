import { MessageSquare } from "lucide-react";
import { Hero } from "@/components/marketing/hero";
import { StatsRow, type StatItem } from "@/components/marketing/stats-row";
import { ToolsShowcase } from "@/components/marketing/tools-showcase";
import { FeatureGrid, type FeatureItem } from "@/components/marketing/feature-grid";
import { CommunityStats, type CommunityStatItem } from "@/components/marketing/community-stats";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { ProgramsTable } from "@/components/marketing/programs-table";
import { resolveIcon } from "@/lib/marketing/icon-registry";
import { getSiteContent } from "@/lib/marketing/get-site-content";

export default async function Home() {
  const siteContent = await getSiteContent();

  const stats: StatItem[] = siteContent.statsItems.map((s) => ({
    icon: resolveIcon(s.icon),
    value: s.value,
    trend: s.trend,
    label: s.label,
    sublabel: s.sublabel,
  }));

  const features: FeatureItem[] = siteContent.featureItems.map((f) => ({
    icon: resolveIcon(f.icon),
    title: f.title,
    description: f.description,
    accent: f.accent,
  }));

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
        socialProof={
          siteContent.heroSocialProofCount && siteContent.heroSocialProofLabel
            ? { count: siteContent.heroSocialProofCount, label: siteContent.heroSocialProofLabel }
            : undefined
        }
        heroImageSrc={siteContent.heroImageUrl ?? undefined}
      />

      <StatsRow stats={stats} />

      <ProgramsTable title={siteContent.programsTableTitle} items={siteContent.programsTableItems} />

      <ToolsShowcase title={siteContent.toolsTitle} subtitle={siteContent.toolsSubtitle} tools={siteContent.toolsItems} />

      <FeatureGrid title={siteContent.featuresTitle} subtitle={siteContent.featuresSubtitle} features={features} />

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
      />
    </>
  );
}
