import { IsString } from 'class-validator';

export class CreateEnrollmentDto {
  @IsString()
  programId!: string;
}
