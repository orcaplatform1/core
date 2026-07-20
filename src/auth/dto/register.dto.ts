import { IsEmail, IsOptional, IsString, IsIn, MinLength, ValidateIf } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsString()
  @MinLength(3)
  username!: string;

  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsString()
  @MinLength(10)
  phone?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(['ERKEK', 'KADIN'])
  gender!: string;
}
