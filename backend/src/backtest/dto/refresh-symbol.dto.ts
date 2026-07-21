import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class RefreshSymbolDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsOptional()
  @IsIn(['1d', '1h'])
  timeframe?: string;
}
