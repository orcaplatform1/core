import { IsString, IsIn, IsInt, Min } from 'class-validator';

export class GetUploadUrlDto {
  @IsString()
  fileName!: string;

  @IsString()
  contentType!: string;

  @IsIn(['videos', 'pdfs', 'resources', 'receipts', 'chart-snapshots'])
  folder!: 'videos' | 'pdfs' | 'resources' | 'receipts' | 'chart-snapshots';

  @IsInt()
  @Min(1)
  fileSizeBytes!: number;
}
