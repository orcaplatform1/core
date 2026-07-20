import { IsString } from 'class-validator';

export class CreateCertificateDto {
  @IsString()
  programId!: string;
}
