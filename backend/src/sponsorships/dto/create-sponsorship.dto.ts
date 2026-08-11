import { IsIn, IsString, IsEmail, IsOptional, IsObject, MaxLength } from 'class-validator';

const SPONSORSHIP_TYPES = ['ICO', 'AIRDROP'];
const DURATIONS = [7, 15, 30];

export class CreateSponsorshipDto {
  @IsIn(SPONSORSHIP_TYPES)
  type!: 'ICO' | 'AIRDROP';

  @IsIn(DURATIONS)
  durationDays!: number;

  @IsString()
  @MaxLength(150)
  contactName!: string;

  @IsEmail()
  contactEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactTelegram?: string;

  // ICO icin CreateIcoProjectDto, Airdrop icin CreateAirdropDto ile ayni
  // sekilde (isAd/adExpiresAt haric) - alanlar SponsorshipsService.validateFormData
  // ile dogrulanir, onay aninda ilgili servise oldugu gibi iletilir.
  @IsObject()
  formData!: Record<string, unknown>;
}
