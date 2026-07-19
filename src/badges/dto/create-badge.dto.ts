import { IsString, IsOptional, IsIn, IsInt, Min } from 'class-validator';

export class CreateBadgeDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsIn(['FIRST_LESSON', 'QUIZ_PASS_COUNT', 'STREAK_DAYS', 'BACKTEST_COUNT', 'SIMULATION_COUNT', 'CUSTOM'])
  triggerType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  requiredCount?: number;
}
