import { Module } from '@nestjs/common';
import { WhaleTrackerController } from './whale-tracker.controller';
import { WhaleTrackerService } from './whale-tracker.service';
import { WhaleTrackerSchedulerService } from './whale-tracker-scheduler.service';

@Module({
  controllers: [WhaleTrackerController],
  providers: [WhaleTrackerService, WhaleTrackerSchedulerService],
})
export class WhaleTrackerModule {}
