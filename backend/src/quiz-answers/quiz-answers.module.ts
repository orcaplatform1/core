import { Module } from '@nestjs/common';
import { QuizAnswersService } from './quiz-answers.service';
import { QuizAnswersController } from './quiz-answers.controller';

@Module({
  controllers: [QuizAnswersController],
  providers: [QuizAnswersService],
})
export class QuizAnswersModule {}
