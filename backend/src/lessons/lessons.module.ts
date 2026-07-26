import { Module } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [AuditLogModule, ProgressModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
