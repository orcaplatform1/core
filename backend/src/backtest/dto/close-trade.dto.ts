import { IsDateString } from 'class-validator';

export class CloseTradeDto {
  @IsDateString()
  exitDate!: string;
}
