import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpsertLessonTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsInt()
  @Min(1)
  targetCount!: number;
}
