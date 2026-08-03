import { IsInt, IsString, Min } from 'class-validator';

export class GetPostUploadUrlDto {
  @IsString()
  fileName!: string;

  @IsString()
  contentType!: string;

  @IsInt()
  @Min(1)
  fileSizeBytes!: number;
}
