import { Module } from '@nestjs/common';
import { LessonTasksService } from './lesson-tasks.service';
import { LessonTasksController } from './lesson-tasks.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [LessonTasksController],
  providers: [LessonTasksService],
})
export class LessonTasksModule {}
