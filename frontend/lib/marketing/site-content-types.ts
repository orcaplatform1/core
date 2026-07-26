export interface NavLinkItem {
  label: string;
  href: string;
}

export interface StatItemData {
  icon?: string;
  value: string;
  trend?: string;
  label: string;
  sublabel?: string;
}

export type ToolPreviewKey = "scanner" | "backtest" | "simulation" | "calendar" | "live";

export interface ToolItemData {
  icon?: string;
  title: string;
  description: string;
  href: string;
  previewKey: ToolPreviewKey;
}

export interface FeatureItemData {
  icon?: string;
  title: string;
  description: string;
  accent?: "primary" | "purple";
}

export interface CommunityStatItemData {
  icon?: string;
  value: string;
  label: string;
}

export interface ProgramsTableRowData {
  level: string;
  title: string;
  duration: string;
}

export interface SiteContentSettings {
  id?: string;

  headerLogoText: string;
  headerLogoImageUrl?: string | null;
  navLinks: NavLinkItem[];

  aiMentorLabel: string;
  aiMentorHref: string;

  heroBadge?: string | null;
  heroTitle: string;
  heroDescription: string;
  heroPrimaryCtaLabel: string;
  heroPrimaryCtaHref: string;
  heroSecondaryCtaLabel?: string | null;
  heroSecondaryCtaHref?: string | null;
  heroSocialProofCount?: string | null;
  heroSocialProofLabel?: string | null;
  heroImageUrl?: string | null;

  statsItems: StatItemData[];

  programsTableTitle: string;
  programsTableItems: ProgramsTableRowData[];

  toolsTitle: string;
  toolsSubtitle: string;
  toolsItems: ToolItemData[];

  featuresTitle: string;
  featuresSubtitle: string;
  featureItems: FeatureItemData[];

  communityTitle: string;
  communityStats: CommunityStatItemData[];
  communityExtraCount?: number | null;

  ctaTitle: string;
  ctaDescription?: string | null;
  ctaButtonLabel: string;
  ctaButtonHref: string;
  ctaChecklist: string[];

  faviconUrl?: string | null;
}

export interface FooterSettingsData {
  id?: string;
  companyName: string;
  description?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  socialLinks?: Record<string, string> | null;
  copyrightText?: string | null;
}
