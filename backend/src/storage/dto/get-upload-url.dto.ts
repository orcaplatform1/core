import { IsString, IsIn, IsInt, Min } from 'class-validator';

export class GetUploadUrlDto {
  @IsString()
  fileName!: string;

  @IsString()
  contentType!: string;

  @IsIn(['videos', 'pdfs', 'resources', 'receipts', 'chart-snapshots', 'community-posts'])
  folder!: 'videos' | 'pdfs' | 'resources' | 'receipts' | 'chart-snapshots' | 'community-posts';

  @IsInt()
  @Min(1)
  fileSizeBytes!: number;
}
