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
      case 'day-trade-scan':
        return this.scannerService.scheduledDayTradeScan();
      case 'day-trade-order-flow-scan':
        return this.scannerService.scheduledDayTradeOrderFlowScan();
      case 'forex-day-trade-scan':
        return this.scannerService.scheduledForexDayTradeScan();
      case 'update-tracked':
        return this.scannerService.updateTrackedSignals();
      case 'cleanup-tracked':
        return this.scannerService.cleanupTrackedSignals();
      default:
        return null;
    }
  }
}
