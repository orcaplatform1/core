import { IsIn, IsString, MinLength } from 'class-validator';

const CATEGORIES = ['PAYMENT', 'TECHNICAL', 'ACCOUNT', 'OTHER'] as const;

export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  subject!: string;

  @IsIn(CATEGORIES)
  category!: (typeof CATEGORIES)[number];

  @IsString()
  @MinLength(3)
  message!: string;
}
