import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ScannerService } from './scanner.service';

@Processor('scanner')
export class ScannerProcessor extends WorkerHost {
  constructor(private readonly scannerService: ScannerService) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'refresh-win-rate':
        return this.scannerService.refreshWinRateCache();
      case 'hourly-scan':
        return this.scannerService.scheduledScan();
      default:
        return null;
    }
  }
}
