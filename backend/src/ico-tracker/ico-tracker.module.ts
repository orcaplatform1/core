import { Module } from '@nestjs/common';
import { IcoTrackerController } from './ico-tracker.controller';
import { IcoTrackerService } from './ico-tracker.service';
import { IcoTrackerSchedulerService } from './ico-tracker-scheduler.service';

@Module({
  controllers: [IcoTrackerController],
  providers: [IcoTrackerService, IcoTrackerSchedulerService],
})
export class IcoTrackerModule {}
