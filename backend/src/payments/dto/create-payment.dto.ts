import { IsString, IsIn, IsOptional } from 'class-validator';
export class CreatePaymentDto {
  @IsString()
  currency!: string;
  @IsIn(['CARD', 'CRYPTO', 'BANK_TRANSFER', 'MOBILE'])
  method!: string;
  @IsOptional()
  @IsIn(['BINANCE', 'OKX', 'BYBIT'])
  cryptoProvider?: string;
  @IsOptional()
  @IsIn(['BTC', 'ETH', 'BNB'])
  cryptoAsset?: string;
  @IsOptional()
  @IsIn(['TURKCELL', 'VODAFONE', 'TURK_TELEKOM'])
  mobileOperator?: string;
  @IsOptional()
  @IsString()
  mobilePhone?: string;
  @IsOptional()
  @IsString()
  receiptUrl?: string;
  @IsOptional()
  @IsString()
  promoCode?: string;
  @IsOptional()
  @IsIn(['PROGRAM', 'MENTOR_CREDITS'])
  purpose?: string;
  @IsOptional()
  @IsIn([100, 250, 500])
  creditAmount?: number;
}
