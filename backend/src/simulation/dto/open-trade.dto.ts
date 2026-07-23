import { IsString, IsNumber, IsIn, IsOptional, Min, Max } from 'class-validator';
export class OpenTradeDto {
  @IsString()
  symbol!: string;
  @IsIn(['BUY', 'SELL'])
  direction!: string;
  @IsNumber()
  quantity!: number;
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(125)
  leverage?: number;
}
