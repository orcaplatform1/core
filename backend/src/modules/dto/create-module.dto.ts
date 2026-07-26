import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @MinLength(1)
  programId!: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
