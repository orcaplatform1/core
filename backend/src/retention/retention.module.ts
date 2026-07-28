import { Module } from '@nestjs/common';
import { RetentionScheduler } from './retention-scheduler.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MentorModule } from '../mentor/mentor.module';

@Module({
  imports: [NotificationsModule, MentorModule],
  providers: [RetentionScheduler],
})
export class RetentionModule {}
