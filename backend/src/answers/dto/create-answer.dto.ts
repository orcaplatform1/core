import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateAnswerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @IsString()
  @MinLength(1)
  questionId!: string;
}
