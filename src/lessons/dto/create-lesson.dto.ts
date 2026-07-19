import {
  IsString,
  IsOptional,
  IsInt,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @IsOptional()
  @IsInt()
  durationSeconds?: number;

  @IsString()
  @MinLength(1)
  moduleId!: string;
}
