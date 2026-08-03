import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class IssueSuspensionDto {
  @IsIn(['COMMENT', 'DM'])
  type!: 'COMMENT' | 'DM';

  @IsInt()
  @IsIn([1, 3, 7])
  days!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
