import { IsString, IsDateString, IsInt, Min } from 'class-validator';

export class CreateLiveLessonDto {
  @IsString()
  title!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @IsString()
  discordLink!: string;
}
