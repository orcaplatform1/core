import { IsString, MinLength, IsNotEmpty, IsIn } from 'class-validator';
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string;
  @IsIn(['username', 'email', 'phone'])
  method!: 'username' | 'email' | 'phone';
  @IsString()
  @MinLength(6)
  password!: string;
}
