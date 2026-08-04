import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WhaleTrackerService } from './whale-tracker.service';

@Injectable()
export class WhaleTrackerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(WhaleTrackerSchedulerService.name);

  constructor(private readonly whaleTrackerService: WhaleTrackerService) {}

  // Uygulama acilisinda once (varsa) ilk-30 listesini tazele - boylece hemen
  // ardindan tetiklenen refreshAll ilk turdan itibaren tum 30 adresi kapsar,
  // gunluk cron'u (04:00) beklemek zorunda kalmaz. Balina bakiye/hareket
  // izleme (refreshAll) birkaç saniye surebilir (30 adres x 200ms gecikme) -
  // bu yuzden app boot'unu bloklamamak icin await edilmiyor, sadece ateşleniyor.
  async onModuleInit() {
    try {
      await this.whaleTrackerService.syncTopAddresses();
    } catch (err) {
      this.logger.warn(`Başlangıç syncTopAddresses hatası: ${err}`);
    }
    this.whaleTrackerService.refreshAll().catch((err) => {
      this.logger.warn(`Başlangıç refreshAll hatası: ${err}`);
    });
  }

  @Cron('*/7 * * * *')
  async refresh() {
    await this.whaleTrackerService.refreshAll();
  }

  // Ilk 30 rich-list adresini ve etiketlerini gunde bir kez tazeler.
  @Cron('0 4 * * *')
  async syncTopAddresses() {
    await this.whaleTrackerService.syncTopAddresses();
  }
}
