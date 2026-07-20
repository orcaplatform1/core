import { IsString, IsArray, ArrayMinSize, ArrayMaxSize, IsInt, Min, Max, IsOptional } from 'class-validator';

export class SubmitTestDto {
  @IsString()
  phone!: string;

  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(3, { each: true })
  answers!: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  goalAnswer?: number;

  @IsOptional()
  @IsString()
  staffPromoCode?: string;
}
