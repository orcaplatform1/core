import { IsString, IsOptional, IsIn, IsInt, Min } from 'class-validator';

export class CreateProgramDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsIn(['BASLANGIC', 'ORTA', 'ILERI'])
  level?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationHours?: number;
}
