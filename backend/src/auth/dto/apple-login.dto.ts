import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}
