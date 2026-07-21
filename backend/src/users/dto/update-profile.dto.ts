import { IsOptional, IsDateString, IsEnum, IsEmail, IsString, MinLength } from 'class-validator';
export enum EducationLevelDto {
  ILKOGRETIM = 'ILKOGRETIM',
  LISE = 'LISE',
  ONLISANS = 'ONLISANS',
  LISANS = 'LISANS',
  DOKTORA = 'DOKTORA',
}
export enum OccupationTypeDto {
  OGRENCI = 'OGRENCI',
  ISSIZ = 'ISSIZ',
  SERBEST_MESLEK = 'SERBEST_MESLEK',
  OZEL_SEKTOR = 'OZEL_SEKTOR',
  KAMU = 'KAMU',
  YONETICI = 'YONETICI',
}
export class UpdateProfileDto {
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
  @IsOptional()
  @IsEnum(EducationLevelDto)
  education?: EducationLevelDto;
  @IsOptional()
  @IsEnum(OccupationTypeDto)
  occupation?: OccupationTypeDto;
  @IsOptional()
  @IsEmail()
  email?: string;
  @IsOptional()
  @IsString()
  @MinLength(10)
  phone?: string;
}
