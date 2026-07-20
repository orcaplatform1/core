import { IsString, IsNotEmpty } from 'class-validator';

export class SaveChartDrawingDto {
  @IsString()
  symbol!: string;

  @IsString()
  context!: string;

  @IsNotEmpty()
  drawings: any;
}
