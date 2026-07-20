import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshSymbolDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;
}
