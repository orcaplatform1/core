export interface NavLinkItem {
  label: string;
  href: string;
}

export interface PartnerItemData {
  icon?: string;
  /** Gerçek marka logosu için lib/marketing/partner-brands.ts anahtarı; boşsa isme göre otomatik tespit edilir. */
  brandKey?: string;
  name: string;
  href?: string;
}

export interface PlatformShowcaseStatItem {
  icon?: string;
  value: string;
  label: string;
}

export interface PlatformShowcaseData {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;

  greetingName: string;
  quoteText: string;
  quoteAuthor: string;

  stats: PlatformShowcaseStatItem[];

  chartOneLabel: string;
  chartOneValue: string;
  chartTwoLabel: string;
  chartTwoValue: string;

  streakDays: number;
  mentorUsageDays: number;
  activeProgramName: string;
  upcomingLessonTitle: string;
  upcomingLessonTime: string;
}

export type ToolPreviewKey = "scanner" | "backtest" | "simulation" | "calendar" | "live";

export interface ToolItemData {
  icon?: string;
  title: string;
  description: string;
  href: string;
  previewKey: ToolPreviewKey;
}

export type CommunityStatAutoMetric = "totalUsers" | "dailyActive";

export interface CommunityStatItemData {
  icon?: string;
  value: string;
  label: string;
  /** Ayarlıysa "value" backend tarafından gerçek verilerle otomatik hesaplanır (bkz. M Dashboard). */
  auto?: CommunityStatAutoMetric;
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
  heroImageUrl?: string | null;

  partnersTitle: string;
  partnersItems: PartnerItemData[];

  featuredProgramIds: string[];

  platformShowcase: PlatformShowcaseData;

  toolsTitle: string;
  toolsSubtitle: string;
  toolsItems: ToolItemData[];

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

export interface LegalPageSummary {
  id: string;
  slug: string;
  title: string;
}

export interface LegalPage extends LegalPageSummary {
  blocks: import("./page-blocks-types").PageBlock[];
  visibility: string[];
  showInFooter: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}
