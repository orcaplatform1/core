import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class BroadcastAnnouncementDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsIn(['ALL', 'PAID', 'FREE'])
  target!: 'ALL' | 'PAID' | 'FREE';

  @IsOptional()
  @IsString()
  link?: string;
}
