import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
@Injectable()
export class ScannerScheduler {
  constructor(@InjectQueue('scanner') private readonly scannerQueue: Queue) {}
  // Swing (kripto + forex) tamamen kaldirildi - sadece Day-Trade taramalari kalir.
  @Cron('*/15 * * * *')
  async queueDayTradeScan() {
    await this.scannerQueue.add('day-trade-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
  }
  @Cron('*/15 * * * *')
  async queueForexDayTradeScan() {
    await this.scannerQueue.add('forex-day-trade-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
  }
  // Acik TrackedSignal'lerin WATCHING->TRIGGERED->HIT_TP/HIT_STOP gecisi
  // eskiden SADECE kripto tarama dongusune (yukarida, 15dk'da bir) bagliydi -
  // Money Maker forex tarafi artik bu gecisleri gercek zamanli "pozisyon"
  // gibi gosterdigi icin (bkz. ForexAutoTradeService) 15 dakikalik gecikme
  // kullanici istegi 2026-08-22'ye gore fazla ("gecikme olursa sıkıntı olur
  // işleme girer çıkarken"). Ayni updateTrackedSignals() cagrisi burada da
  // (2 dk'da bir) calisir - iki cagrinin nadiren ust uste binmesi (ayni
  // TrackedSignal'in iki kez islenmesi) zararsizdir, sadece gereksiz bir
  // tekrar islem olur, veri bozulmaz.
  @Cron('*/2 * * * *')
  async queueUpdateTracked() {
    await this.scannerQueue.add('update-tracked', {}, { attempts: 3, backoff: { type: 'fixed', delay: 5000 } });
  }
  @Cron('0 3 * * *')
  async queueDailyCleanup() {
    await this.scannerQueue.add('cleanup-tracked', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
  }
}
