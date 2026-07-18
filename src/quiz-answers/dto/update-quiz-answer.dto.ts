import { PartialType } from '@nestjs/mapped-types';
import { CreateQuizAnswerDto } from './create-quiz-answer.dto';

export class UpdateQuizAnswerDto extends PartialType(CreateQuizAnswerDto) {}
