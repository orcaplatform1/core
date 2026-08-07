import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsUrl,
  IsIn,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

const AIRDROP_STATUSES = ['UPCOMING', 'ACTIVE', 'ENDED'];
const AIRDROP_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

export class CreateAirdropDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  // Bos birakilirsa title'dan otomatik uretilir (bkz. AirdropService.slugify).
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @IsString()
  @MaxLength(200)
  projectName!: string;

  @IsString()
  @MaxLength(100)
  blockchain!: string;

  @IsString()
  @MaxLength(100)
  category!: string;

  @IsOptional()
  @IsUrl()
  logo?: string;

  @IsOptional()
  @IsUrl()
  banner?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsUrl()
  twitter?: string;

  @IsOptional()
  @IsUrl()
  discord?: string;

  @IsOptional()
  @IsUrl()
  telegram?: string;

  @IsOptional()
  @IsUrl()
  documentation?: string;

  @IsOptional()
  @IsIn(AIRDROP_STATUSES)
  status?: string;

  @IsString()
  @MaxLength(100)
  rewardType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  estimatedReward?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedValueUSD?: number;

  @IsOptional()
  @IsIn(AIRDROP_DIFFICULTIES)
  difficulty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  completionTime?: string;

  @IsOptional()
  @IsBoolean()
  requiresKYC?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresWallet?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresDiscord?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresTwitter?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresTelegram?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  snapshotDate?: string;

  @IsOptional()
  @IsDateString()
  claimDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  aiScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  riskScore?: number;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  // #Ads: true ise listelerde en üstte sabitlenir. adExpiresAt geçince
  // otomatik olarak false'a döner (bkz. AirdropService.expireAds).
  @IsOptional()
  @IsBoolean()
  isAd?: boolean;

  @IsOptional()
  @IsDateString()
  adExpiresAt?: string;
}
