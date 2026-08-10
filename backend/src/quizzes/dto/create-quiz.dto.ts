import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateQuizDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  timeLimitMinutes?: number;

  @IsString()
  @MinLength(1)
  lessonId!: string;
}
