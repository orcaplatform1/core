import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminUpdateIdentityDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;
}
