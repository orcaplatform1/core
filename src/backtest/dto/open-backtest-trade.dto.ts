import { IsString, IsNumber, IsIn, IsDateString } from 'class-validator';

export class OpenBacktestTradeDto {
  @IsString()
  symbol!: string;

  @IsIn(['BUY', 'SELL'])
  direction!: string;

  @IsNumber()
  quantity!: number;

  @IsDateString()
  entryDate!: string;
}
