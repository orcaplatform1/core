import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateSiteContentDto {
  @IsOptional()
  @IsString()
  headerLogoText?: string;

  @IsOptional()
  @IsString()
  headerLogoImageUrl?: string;

  @IsOptional()
  navLinks?: { label: string; href: string }[];

  @IsOptional()
  @IsString()
  aiMentorLabel?: string;

  @IsOptional()
  @IsString()
  aiMentorHref?: string;

  @IsOptional()
  @IsString()
  heroBadge?: string;

  @IsOptional()
  @IsString()
  heroTitle?: string;

  @IsOptional()
  @IsString()
  heroDescription?: string;

  @IsOptional()
  @IsString()
  heroPrimaryCtaLabel?: string;

  @IsOptional()
  @IsString()
  heroPrimaryCtaHref?: string;

  @IsOptional()
  @IsString()
  heroSecondaryCtaLabel?: string;

  @IsOptional()
  @IsString()
  heroSecondaryCtaHref?: string;

  @IsOptional()
  @IsString()
  heroSocialProofCount?: string;

  @IsOptional()
  @IsString()
  heroSocialProofLabel?: string;

  @IsOptional()
  @IsString()
  heroImageUrl?: string;

  @IsOptional()
  statsItems?: { icon?: string; value: string; trend?: string; label: string; sublabel?: string }[];

  @IsOptional()
  @IsString()
  programsTableTitle?: string;

  @IsOptional()
  programsTableItems?: { level: string; title: string; duration: string }[];

  @IsOptional()
  @IsString()
  toolsTitle?: string;

  @IsOptional()
  @IsString()
  toolsSubtitle?: string;

  @IsOptional()
  toolsItems?: {
    icon?: string;
    title: string;
    description: string;
    href: string;
    previewKey?: string;
  }[];

  @IsOptional()
  @IsString()
  featuresTitle?: string;

  @IsOptional()
  @IsString()
  featuresSubtitle?: string;

  @IsOptional()
  featureItems?: { icon?: string; title: string; description: string; accent?: string }[];

  @IsOptional()
  @IsString()
  communityTitle?: string;

  @IsOptional()
  communityStats?: { icon?: string; value: string; label: string }[];

  @IsOptional()
  @IsInt()
  communityExtraCount?: number;

  @IsOptional()
  @IsString()
  ctaTitle?: string;

  @IsOptional()
  @IsString()
  ctaDescription?: string;

  @IsOptional()
  @IsString()
  ctaButtonLabel?: string;

  @IsOptional()
  @IsString()
  ctaButtonHref?: string;

  @IsOptional()
  ctaChecklist?: string[];

  @IsOptional()
  @IsString()
  faviconUrl?: string;
}
