import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateQuizAnswerDto {
  @IsString()
  @MinLength(1)
  quizAttemptId!: string;

  @IsString()
  @MinLength(1)
  questionId!: string;

  @IsString()
  @MinLength(1)
  selectedAnswerId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpent?: number;
}
