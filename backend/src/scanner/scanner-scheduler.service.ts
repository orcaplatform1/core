import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScannerService } from './scanner.service';
@Injectable()
export class ScannerScheduler {
  constructor(
    @InjectQueue('scanner') private readonly scannerQueue: Queue,
    private readonly scannerService: ScannerService,
  ) {}
  // Swing (kripto + forex) tamamen kaldirildi - sadece Day-Trade taramalari kalir.
  //
  // jobId SABIT verilir: BullMQ, waiting/active/delayed durumunda ayni jobId'li
  // bir job zaten varsa yeni add() cagrisini yoksayar (job.id Redis'te tekil
  // anahtar). Bu, backend restart sonrasi Redis'te biriken eski joblar +
  // yeni cron tick'i AYNI ANDA worker'a (concurrency:2) dusup ayni taramanin
  // iki kez calismasini engeller - bkz. kullanici geri bildirimi 2026-08-23:
  // restart sonrasi OPUSDT icin 2 dakika arayla iki ayri sinyal/trade acilmisti
  // (kanit: pm2 loglarinda ayni [scanDayTrade] blogu art arda iki kez, ayni
  // qty/price ile).
  //
  // removeOnComplete/removeOnFail ZORUNLU: BullMQ'da sabit jobId'li bir job
  // tamamlaninca Redis'teki hash SILINMEZSE (varsayilan), o jobId sonsuza
  // kadar "dolu" sayilir - sonraki HER add() cagrisi (yeni cron tick'i dahil)
  // mevcut (tamamlanmis) job'u sessizce geri dondurur, YENI bir job hic
  // olusmaz. Bu yuzden 2026-08-23 sabahi tek bir basarili calismadan sonra
  // uc tarama da (day-trade-scan/day-trade-order-flow-scan/forex-day-trade-scan)
  // saatlerce hic tetiklenmedi - kullanici "tarama durmus" diye bildirdi,
  // kok sebep buydu (bkz. redis'teki bull:scanner:day-trade-scan hash'inin
  // saatlerdir ayni finishedOn degerinde donmus olmasi).
  @Cron('*/15 * * * *')
  async queueDayTradeScan() {
    await this.scannerQueue.add('day-trade-scan', {}, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 10000 },
      jobId: 'day-trade-scan',
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
  // Test Flow (Order Flow varyanti) - sadece ScannerConfig.orderFlowTestEnabled
  // acikken periyodik olarak taranir (admin panelden kapatilabilir); manuel
  // "Şimdi Tara" butonu (ScannerController.runDayTradeOrderFlowScan) bu
  // toggle'dan bagimsiz her zaman calisir.
  @Cron('*/15 * * * *')
  async queueDayTradeOrderFlowScan() {
    const enabled = await this.scannerService.isOrderFlowTestEnabled();
    if (!enabled) return;
    await this.scannerQueue.add('day-trade-order-flow-scan', {}, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 10000 },
      jobId: 'day-trade-order-flow-scan',
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
  @Cron('*/15 * * * *')
  async queueForexDayTradeScan() {
    await this.scannerQueue.add('forex-day-trade-scan', {}, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 10000 },
      jobId: 'forex-day-trade-scan',
      removeOnComplete: true,
      removeOnFail: true,
    });
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
