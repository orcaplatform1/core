import { IsString, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  lessonId?: string;
}
