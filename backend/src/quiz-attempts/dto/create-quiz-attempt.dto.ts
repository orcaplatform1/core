import {
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class QuizAnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  answerId!: string;
}

export class CreateQuizAttemptDto {
  @IsString()
  quizId!: string;

  @IsString()
  lessonId!: string;

  @IsString()
  moduleId!: string;

  @IsString()
  programId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];
}
