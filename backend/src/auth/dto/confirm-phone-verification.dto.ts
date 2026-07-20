import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmPhoneVerificationDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}
