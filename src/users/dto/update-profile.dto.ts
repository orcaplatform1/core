import { IsOptional, IsString, IsDateString, IsEnum, MaxLength } from 'class-validator';

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
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(EducationLevelDto)
  education?: EducationLevelDto;

  @IsOptional()
  @IsEnum(OccupationTypeDto)
  occupation?: OccupationTypeDto;
}
