import { IsString, IsNumber, IsIn, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsString()
  currency!: string;

  @IsIn(['CARD', 'CRYPTO', 'BANK_TRANSFER'])
  method!: string;

  @IsOptional()
  @IsIn(['BINANCE', 'OKX', 'BYBIT'])
  cryptoProvider?: string;

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
