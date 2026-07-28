import { IsString, IsOptional, IsBoolean, IsInt, IsArray, IsIn } from 'class-validator';

export class CreatePageDto {
  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  // The block union (heading/paragraph/bulletList/image/divider) isn't easily expressed
  // as a single class-validator DTO since it's a discriminated union of 5 shapes.
  // We only validate that it's an array here — the frontend (see
  // frontend/lib/marketing/page-blocks-types.ts) is responsible for sending well-shaped blocks.
  @IsArray()
  blocks!: any[];

  @IsOptional()
  @IsArray()
  @IsIn(['GUEST', 'STUDENT', 'STAFF', 'SUPER_ADMIN'], { each: true })
  visibility?: string[];

  @IsOptional()
  @IsBoolean()
  showInFooter?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}
