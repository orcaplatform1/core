import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
@Injectable()
export class ScannerScheduler {
  constructor(@InjectQueue('scanner') private readonly scannerQueue: Queue) {}
  // Swing (kripto + forex) tamamen kaldirildi - sadece Day-Trade taramalari kalir.
  @Cron('*/15 * * * *')
  async queueDayTradeScan() {
    await this.scannerQueue.add('day-trade-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
  }
  @Cron('*/15 * * * *')
  async queueForexDayTradeScan() {
    await this.scannerQueue.add('forex-day-trade-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
  }
  @Cron('0 3 * * *')
  async queueDailyCleanup() {
    await this.scannerQueue.add('cleanup-tracked', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
  }
}
