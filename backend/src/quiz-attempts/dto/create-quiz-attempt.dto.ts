import { IsString } from 'class-validator';

export class CreateQuizAttemptDto {
  @IsString()
  quizId!: string;

  @IsString()
  lessonId!: string;

  @IsString()
  moduleId!: string;

  @IsString()
  programId!: string;
}
