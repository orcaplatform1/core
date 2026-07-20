import { IsString, IsNotEmpty } from 'class-validator';

export class AddResourceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  url!: string;
}
