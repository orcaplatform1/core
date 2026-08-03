import { IsIn } from 'class-validator';

export class ModerateCommentDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';
}
