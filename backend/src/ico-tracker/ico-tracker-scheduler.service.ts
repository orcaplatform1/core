import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IcoTrackerService } from './ico-tracker.service';

@Injectable()
export class IcoTrackerSchedulerService implements OnModuleInit {
  constructor(private readonly icoTracker: IcoTrackerService) {}

  async onModuleInit() {
    await this.icoTracker.refresh();
  }

  @Cron('0 8 * * *')
  async refresh() {
    await this.icoTracker.refresh();
  }
}
