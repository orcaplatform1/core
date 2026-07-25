import { IsInt } from 'class-validator';
export class AdjustMentorCreditsDto {
  @IsInt()
  delta!: number;
}
