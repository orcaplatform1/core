import { IsString, MinLength, MaxLength } from 'class-validator';

export class TrackVisitDto {
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  visitorId!: string;
}
