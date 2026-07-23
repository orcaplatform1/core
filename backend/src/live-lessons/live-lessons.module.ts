import { Module } from '@nestjs/common';
import { LiveLessonsService } from './live-lessons.service';
import { LiveLessonsController } from './live-lessons.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({
  imports: [AuditLogModule, NotificationsModule],
  controllers: [LiveLessonsController],
  providers: [LiveLessonsService],
})
export class LiveLessonsModule {}
