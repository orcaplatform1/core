import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ScannerService } from './scanner.service';
@Processor('scanner', { concurrency: 2, lockDuration: 300000 })
export class ScannerProcessor extends WorkerHost {
  constructor(private readonly scannerService: ScannerService) {
    super();
  }
  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'hourly-scan':
        return this.scannerService.scheduledScan();
      case 'day-trade-scan':
        return this.scannerService.scheduledDayTradeScan();
      case 'forex-swing-scan':
        return this.scannerService.scheduledForexSwingScan();
      case 'forex-day-trade-scan':
        return this.scannerService.scheduledForexDayTradeScan();
      case 'cleanup-tracked':
        return this.scannerService.cleanupTrackedSignals();
      case 'refresh-winrate':
        return this.scannerService.refreshWinRateCache();
      default:
        return null;
    }
  }
}
