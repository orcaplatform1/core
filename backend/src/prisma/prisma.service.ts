import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
  }

  // Postgres'in kisa sureli otomatik guncelleme restart'lari (bkz. unattended-upgrades,
  // birkac gunde bir sabah ~06:00-07:00) sirasinda backend tam o anda ayaga kalkarsa
  // ilk $connect() denemesi basarisiz olabiliyordu - retry olmadan Nest bootstrap
  // tamamen patliyordu. 5 deneme, artan bekleme ile.
  async onModuleInit() {
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        return;
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        const delayMs = attempt * 2000;
        console.error(`[PrismaService] $connect basarisiz (deneme ${attempt}/${maxAttempts}), ${delayMs}ms sonra tekrar denenecek:`, err);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
