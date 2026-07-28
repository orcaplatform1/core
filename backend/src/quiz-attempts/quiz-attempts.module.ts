import { Module } from '@nestjs/common';
import { QuizAttemptsService } from './quiz-attempts.service';
import { QuizAttemptsController } from './quiz-attempts.controller';
import { BadgesModule } from '../badges/badges.module';
import { PointsModule } from '../points/points.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [BadgesModule, PointsModule, NotificationsModule],
  controllers: [QuizAttemptsController],
  providers: [QuizAttemptsService],
})
export class QuizAttemptsModule {}
