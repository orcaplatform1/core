import { IsString } from 'class-validator';
export class GrantEnrollmentDto {
  @IsString()
  programId!: string;
}
