import { IsInt, IsString, Min, Max } from 'class-validator';

export class CreateSubscriptionDto {
  @IsInt()
  @Min(1)
  @Max(12)
  months!: number;

  // SUPER_ADMIN'in kime abonelik tanimladigini belirtmesi icin (bkz.
  // subscriptions.controller.ts subscribe - global ValidationPipe
  // whitelist:true oldugundan burada tanimlanmayan alanlar govdeden silinir).
  @IsString()
  userId!: string;
}
