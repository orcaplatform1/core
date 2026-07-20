import { IsString, IsOptional } from 'class-validator';

export class UpdateFooterDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  socialLinks?: Record<string, string>;

  @IsOptional()
  @IsString()
  copyrightText?: string;
}
