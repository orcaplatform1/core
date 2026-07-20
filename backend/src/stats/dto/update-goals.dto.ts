import { IsOptional, IsInt, Min } from 'class-validator';

export class UpdateGoalsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  dailyGoalLessons?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  weeklyGoalLessons?: number;
}
