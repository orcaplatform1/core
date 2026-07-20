import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class UpdateProgressDto {
  @IsString()
  lessonId!: string;

  @IsInt()
  @Min(0)
  watchedSeconds!: number;
}
