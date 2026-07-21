import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
