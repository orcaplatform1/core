import { IsString, IsOptional, IsBoolean, IsNumber, IsUrl, IsIn, IsDateString, Min, MaxLength } from 'class-validator';


const ICO_STATUSES = ['UPCOMING', 'ACTIVE', 'ENDED'];

export class CreateIcoProjectDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  tokenSymbol?: string;

  @IsOptional()
  @IsIn(ICO_STATUSES)
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  raisedAmountUsd?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ratingScore?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  blockchain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  // Ornek: "IDO", "IEO", "Private Sale", "Public Sale", "Whitelist"
  @IsOptional()
  @IsString()
  @MaxLength(50)
  saleType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  launchpad?: string;

  // "Lansmani nereden alabilecegin" - launchpad/katilim linki (icodrops.com'daki
  // "Get Allocation" bagliantisiyla ayni islevi gorur)
  @IsOptional()
  @IsUrl()
  launchpadUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tokenPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hardCapUsd?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valuationUsd?: number;

  @IsOptional()
  @IsString()
  allocationDetails?: string;

  @IsOptional()
  @IsBoolean()
  requiresKYC?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresWhitelist?: boolean;

  @IsOptional()
  @IsUrl()
  twitter?: string;

  @IsOptional()
  @IsUrl()
  telegram?: string;

  @IsOptional()
  @IsUrl()
  discord?: string;

  // #Ads: true ise listelerde en üstte sabitlenir. adExpiresAt geçince
  // otomatik olarak false'a döner (bkz. IcoTrackerService.expireAds).
  @IsOptional()
  @IsBoolean()
  isAd?: boolean;

  @IsOptional()
  @IsDateString()
  adExpiresAt?: string;
}
