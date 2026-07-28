import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CryptoCalendarService } from './crypto-calendar.service';

@Injectable()
export class CryptoCalendarScheduler implements OnModuleInit {
  constructor(private readonly cryptoCalendarService: CryptoCalendarService) {}

  // Uygulama açılışında tablo boşken bir sonraki cron'u beklemek yerine
  // bir kez hemen tazele.
  async onModuleInit() {
    await this.cryptoCalendarService.refresh();
  }

  @Cron('0 */6 * * *')
  async refresh() {
    await this.cryptoCalendarService.refresh();
  }
}
