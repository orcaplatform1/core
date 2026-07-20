import { Module } from '@nestjs/common';
import { LiveLessonsService } from './live-lessons.service';
import { LiveLessonsController } from './live-lessons.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [LiveLessonsController],
  providers: [LiveLessonsService],
})
export class LiveLessonsModule {}
