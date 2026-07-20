import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreatePageDto {
  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsBoolean()
  showInFooter?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}
