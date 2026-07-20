import { IsString, IsNotEmpty } from 'class-validator';

export class FinishQuizAttemptDto {
  @IsString()
  @IsNotEmpty()
  attemptId!: string;
}
