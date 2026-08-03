import { IsIn } from 'class-validator';

export class ReactCommentDto {
  @IsIn(['LIKE', 'DISLIKE'])
  type!: 'LIKE' | 'DISLIKE';
}
