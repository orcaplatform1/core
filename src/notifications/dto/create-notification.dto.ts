import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  userId!: string;

  @IsIn(['NEW_LESSON', 'NEW_PROGRAM', 'QUIZ_RESULT', 'AI_SUGGESTION', 'CERTIFICATE_READY', 'ANNOUNCEMENT', 'LIVE_LESSON_REMINDER', 'SYSTEM'])
  type!: string;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  link?: string;
}
