import { PartialType } from '@nestjs/mapped-types';
import { CreateLiveLessonDto } from './create-live-lesson.dto';

export class UpdateLiveLessonDto extends PartialType(CreateLiveLessonDto) {}
