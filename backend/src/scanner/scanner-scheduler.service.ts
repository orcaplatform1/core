import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
@Injectable()
export class ScannerScheduler {
  constructor(@InjectQueue('scanner') private readonly scannerQueue: Queue) {}
  @Cron('*/15 * * * *')
  async queueHourlyScan() {
    await this.scannerQueue.add('hourly-scan', {});
  }
  @Cron('*/15 * * * *')
  async queueDayTradeScan() {
    await this.scannerQueue.add('day-trade-scan', {});
  }
  @Cron('0 3 * * *')
  async queueDailyCleanup() {
    await this.scannerQueue.add('cleanup-tracked', {});
  }
}
