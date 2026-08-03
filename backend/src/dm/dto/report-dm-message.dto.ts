import { IsString, MinLength, MaxLength } from 'class-validator';

export class ReportDmMessageDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
