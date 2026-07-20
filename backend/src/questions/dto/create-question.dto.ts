import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @MinLength(1)
  quizId!: string;
}
