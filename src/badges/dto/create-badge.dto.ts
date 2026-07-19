import { IsString } from 'class-validator';

export class CreateBadgeDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;
}
