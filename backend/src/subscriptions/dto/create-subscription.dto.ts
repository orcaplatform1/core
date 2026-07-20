import { IsInt, Min, Max } from 'class-validator';

export class CreateSubscriptionDto {
  @IsInt()
  @Min(1)
  @Max(12)
  months!: number;
}
