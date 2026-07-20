import { IsString, IsNotEmpty } from 'class-validator';

export class GrantBadgeDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
