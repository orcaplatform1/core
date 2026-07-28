import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WhaleTrackerService } from './whale-tracker.service';

@Injectable()
export class WhaleTrackerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(WhaleTrackerSchedulerService.name);

  constructor(private readonly whaleTrackerService: WhaleTrackerService) {}

  // Uygulama açılışında ilk cron turunu (7 dk'ya kadar) beklemek yerine bir kez
  // hemen tazele. Birkaç saniye sürebilir (6 adres x 200ms gecikme) — bu yüzden
  // app boot'unu bloklamamak için await edilmiyor, sadece ateşleniyor.
  onModuleInit() {
    this.whaleTrackerService.refreshAll().catch((err) => {
      this.logger.warn(`Başlangıç refreshAll hatası: ${err}`);
    });
  }

  @Cron('*/7 * * * *')
  async refresh() {
    await this.whaleTrackerService.refreshAll();
  }
}
