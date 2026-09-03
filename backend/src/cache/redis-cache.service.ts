import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    retryStrategy: (times: number) => Math.min(times * 500, 10000),
  });

  constructor() {
    // Dinleyici olmadan ioredis "Unhandled error event" olarak logluyordu (bkz.
    // unattended-upgrades kaynakli kisa Redis restart'lari) - client zaten otomatik
    // reconnect ediyor, burada sadece net loglama icin.
    this.client.on('error', (err) => this.logger.warn(`Redis baglanti hatasi (otomatik yeniden baglanilacak): ${err.message}`));
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
