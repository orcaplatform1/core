import { Module } from '@nestjs/common';
import { IcoTrackerController } from './ico-tracker.controller';
import { AdminIcoTrackerController } from './admin-ico-tracker.controller';
import { IcoTrackerService } from './ico-tracker.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [IcoTrackerController, AdminIcoTrackerController],
  providers: [IcoTrackerService],
  exports: [IcoTrackerService],
})
export class IcoTrackerModule {}
