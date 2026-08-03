import { IsInt, Min } from 'class-validator';

export class SetTaskProgressDto {
  @IsInt()
  @Min(0)
  completedCount!: number;
}
