import { Module } from '@nestjs/common';
import { QuizAttemptsService } from './quiz-attempts.service';
import { QuizAttemptsController } from './quiz-attempts.controller';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [BadgesModule],
  controllers: [QuizAttemptsController],
  providers: [QuizAttemptsService],
})
export class QuizAttemptsModule {}
