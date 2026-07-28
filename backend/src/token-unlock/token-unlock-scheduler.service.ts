import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TokenUnlockService } from './token-unlock.service';

@Injectable()
export class TokenUnlockScheduler implements OnModuleInit {
  constructor(private readonly tokenUnlockService: TokenUnlockService) {}

  // Uygulama açılışında tablo boşken bir sonraki cron'u beklemek yerine
  // bir kez hemen tazele.
  async onModuleInit() {
    await this.tokenUnlockService.refresh();
  }

  @Cron('0 9 * * *')
  async refresh() {
    await this.tokenUnlockService.refresh();
  }
}
