import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CompleteProfileDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsIn(['ERKEK', 'KADIN'])
  gender!: string;
}
