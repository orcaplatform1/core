import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

const JOB_OPTS = { attempts: 3, backoff: { type: 'fixed' as const, delay: 10000 } };

@Injectable()
export class PublicToolsScheduler implements OnModuleInit {
  constructor(@InjectQueue('public-tools') private readonly queue: Queue) {}

  // Uygulama açılışında önbellek boşken bir sonraki cron'u (15 dk'ya kadar) beklemek
  // yerine tüm kaynakları bir kez hemen tazele.
  async onModuleInit() {
    for (const name of [
      'refresh-ticker',
      'refresh-heatmap',
      'refresh-funding',
      'refresh-fear-greed',
      'refresh-liq-zones',
      'refresh-forex',
      'refresh-economic',
      'refresh-sparklines',
      'refresh-bist',
      'refresh-gold-tl',
      'refresh-cot',
      'refresh-correlation',
      'refresh-trending',
      'refresh-stablecoins',
      'refresh-altcoin-season',
      'refresh-etf-flows',
      'refresh-onchain',
    ]) {
      await this.queue.add(name, {}, JOB_OPTS);
    }
  }

  @Cron('*/1 * * * *')
  async queueTicker() {
    await this.queue.add('refresh-ticker', {}, JOB_OPTS);
  }

  @Cron('*/5 * * * *')
  async queueHeatmap() {
    await this.queue.add('refresh-heatmap', {}, JOB_OPTS);
  }

  @Cron('*/5 * * * *')
  async queueSparklines() {
    await this.queue.add('refresh-sparklines', {}, JOB_OPTS);
  }

  @Cron('*/5 * * * *')
  async queueFunding() {
    await this.queue.add('refresh-funding', {}, JOB_OPTS);
  }

  @Cron('0 * * * *')
  async queueFearGreed() {
    await this.queue.add('refresh-fear-greed', {}, JOB_OPTS);
  }

  @Cron('*/10 * * * *')
  async queueLiqZones() {
    await this.queue.add('refresh-liq-zones', {}, JOB_OPTS);
  }

  @Cron('*/15 * * * *')
  async queueForex() {
    await this.queue.add('refresh-forex', {}, JOB_OPTS);
  }

  @Cron('0 6 * * *')
  async queueEconomic() {
    await this.queue.add('refresh-economic', {}, JOB_OPTS);
  }

  @Cron('*/5 * * * *')
  async queueBist() {
    await this.queue.add('refresh-bist', {}, JOB_OPTS);
  }

  @Cron('*/15 * * * *')
  async queueGoldTl() {
    await this.queue.add('refresh-gold-tl', {}, JOB_OPTS);
  }

  @Cron('*/15 * * * *')
  async queueTrending() {
    await this.queue.add('refresh-trending', {}, JOB_OPTS);
  }

  @Cron('*/15 * * * *')
  async queueStablecoins() {
    await this.queue.add('refresh-stablecoins', {}, JOB_OPTS);
  }

  @Cron('0 7 * * *')
  async queueAltcoinSeason() {
    await this.queue.add('refresh-altcoin-season', {}, JOB_OPTS);
  }

  @Cron('0 8 * * *')
  async queueEtfFlows() {
    await this.queue.add('refresh-etf-flows', {}, JOB_OPTS);
  }

  @Cron('0 9 * * *')
  async queueCot() {
    await this.queue.add('refresh-cot', {}, JOB_OPTS);
  }

  @Cron('0 10 * * *')
  async queueCorrelation() {
    await this.queue.add('refresh-correlation', {}, JOB_OPTS);
  }

  @Cron('*/10 * * * *')
  async queueOnchain() {
    await this.queue.add('refresh-onchain', {}, JOB_OPTS);
  }
}
