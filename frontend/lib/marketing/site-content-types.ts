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

export interface PlatformShowcaseData {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  /** MacBook+iPhone mockup'ının laptop ekranına yerleştirilen dashboard görüntüsü. */
  imageUrl?: string | null;
  /** Aynı mockup'ın telefon ekranına yerleştirilen görüntü (admin panelden yüklenir). */
  phoneImageUrl?: string | null;
}

export type ToolPreviewKey = "scanner" | "backtest" | "simulation" | "calendar" | "live";

export interface ToolItemData {
  icon?: string;
  title: string;
  description: string;
  href: string;
  previewKey: ToolPreviewKey;
}

export interface WhyOrcaItemData {
  /** Sıralamayı korumak için kullanılan sabit anahtar ("1".."6" vb.) - liste bu alana göre değil, admin panelindeki sıraya göre gösterilir. */
  slug: string;
  badgeLabel: string;
  /** Hex renk (ör. "#32D66B") - rozet dolgusu ve ikon alanındaki radial glow bu renkten türetilir. */
  badgeColor: string;
  icon?: string;
  /** Admin panelden yüklenirse ikonun yerine gösterilir. */
  imageUrl?: string | null;
  title: string;
  description: string;
  href: string;
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

  whyOrcaTitle: string;
  whyOrcaItems: WhyOrcaItemData[];

  communityEnabled: boolean;
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

export interface FooterLinkItem {
  label: string;
  href: string;
}

export interface FooterSettingsData {
  id?: string;
  companyName: string;
  description?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  socialLinks?: Record<string, string> | null;
  copyrightText?: string | null;
  platformLinks?: FooterLinkItem[] | null;
  supportLinks?: FooterLinkItem[] | null;
  legalDisclaimer?: string | null;
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
