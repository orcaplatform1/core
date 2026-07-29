import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

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
  heroImageUrl?: string;

  @IsOptional()
  @IsString()
  partnersTitle?: string;

  @IsOptional()
  partnersItems?: { icon?: string; brandKey?: string; name: string; href?: string }[];

  @IsOptional()
  @IsString({ each: true })
  featuredProgramIds?: string[];

  @IsOptional()
  platformShowcase?: {
    eyebrow: string;
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    imageUrl?: string | null;
  };

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
  @IsBoolean()
  communityEnabled?: boolean;

  @IsOptional()
  @IsString()
  communityTitle?: string;

  @IsOptional()
  communityStats?: { icon?: string; value: string; label: string; auto?: string }[];

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
