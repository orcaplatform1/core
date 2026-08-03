import { IsIn } from 'class-validator';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED'] as const;

export class UpdateTicketStatusDto {
  @IsIn(STATUSES)
  status!: (typeof STATUSES)[number];
}
