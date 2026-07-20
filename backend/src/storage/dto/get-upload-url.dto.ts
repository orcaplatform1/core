import { IsString, IsIn, IsInt, Min } from 'class-validator';

export class GetUploadUrlDto {
  @IsString()
  fileName!: string;

  @IsString()
  contentType!: string;

  @IsIn(['videos', 'pdfs', 'resources'])
  folder!: 'videos' | 'pdfs' | 'resources';

  @IsInt()
  @Min(1)
  fileSizeBytes!: number;
}
