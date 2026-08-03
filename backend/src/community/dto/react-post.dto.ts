import { IsIn } from 'class-validator';

export class ReactPostDto {
  @IsIn(['LIKE', 'DISLIKE'])
  type!: 'LIKE' | 'DISLIKE';
}
