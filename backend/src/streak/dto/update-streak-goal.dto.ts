import { IsInt, Min, Max } from 'class-validator';

export class UpdateStreakGoalDto {
  @IsInt()
  @Min(1)
  @Max(365)
  streakGoalDays!: number;
}
