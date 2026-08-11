import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectSponsorshipDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
