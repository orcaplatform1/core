import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateSuccessStoryDto {
  @IsString()
  @MinLength(5)
  @MaxLength(150)
  title!: string;

  @IsString()
  @MinLength(50)
  @MaxLength(5000)
  content!: string;
}
