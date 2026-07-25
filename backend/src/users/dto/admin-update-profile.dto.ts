import { IsOptional, IsString, IsEmail, IsEnum, IsDateString } from 'class-validator';
export class AdminUpdateProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string;
  @IsOptional()
  @IsString()
  phone?: string;
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
  @IsOptional()
  @IsEnum(['ILKOGRETIM', 'LISE', 'ONLISANS', 'LISANS', 'DOKTORA'])
  education?: string;
  @IsOptional()
  @IsEnum(['OGRENCI', 'ISSIZ', 'SERBEST_MESLEK', 'OZEL_SEKTOR', 'KAMU', 'YONETICI'])
  occupation?: string;
  @IsOptional()
  @IsEnum(['ERKEK', 'KADIN'])
  gender?: string;
}
