import { Type, Transform } from 'class-transformer';
import { IsOptional, IsString, IsIn, IsInt, IsNumber, Min, Max, MaxLength } from 'class-validator';

const AIRDROP_STATUSES = ['UPCOMING', 'ACTIVE', 'ENDED'];
const AIRDROP_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

// Query string'ler her zaman metin gelir ("true"/"false") - class-transformer'in
// @Type(() => Boolean) donusumu Boolean("false") === true ureterek yanlis sonuc
// verir, bu yuzden elle karsilastirma yapilir.
const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

export class QueryAirdropDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  blockchain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsIn(AIRDROP_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(AIRDROP_DIFFICULTIES)
  difficulty?: string;

  @IsOptional()
  @Transform(toBoolean)
  requiresKYC?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  requiresWallet?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minReward?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxReward?: number;
}
