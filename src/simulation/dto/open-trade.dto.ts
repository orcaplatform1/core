import { IsString, IsNumber, IsIn } from 'class-validator';

export class OpenTradeDto {
  @IsString()
  symbol!: string;

  @IsIn(['BUY', 'SELL'])
  direction!: string;

  @IsNumber()
  quantity!: number;
}
