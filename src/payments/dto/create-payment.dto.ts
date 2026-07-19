import { IsString, IsNumber, IsIn, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  @IsIn(['CARD', 'CRYPTO', 'BANK_TRANSFER'])
  method!: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  promoCode?: string;
}
