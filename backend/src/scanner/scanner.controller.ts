import { Controller, Get, Post, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScannerService } from './scanner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// CRYPTO'da iki strateji varyanti paralel calisiyor (bkz. scanner.service.ts
// basindaki ICT_BASE_STRATEGY_NAME/ICT_ORDER_FLOW_STRATEGY_NAME) - hangisinin
// sonuclarina bakildigi ?strategy=ORDER_FLOW query param'iyla secilir.
// FOREX'in tek varyanti oldugu icin strategy param'i FOREX'te yok sayilir.
function resolveStrategyName(market: string, strategy?: string): string {
  if (market === 'FOREX') return 'FX_LIQUIDITY_SWEEP';
  return strategy === 'ORDER_FLOW' ? 'ICT_BREAKOUT_RETEST_OF' : 'ICT_BREAKOUT_RETEST';
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('scanner')
export class ScannerController {
  constructor(
    private readonly scannerService: ScannerService,
    @InjectQueue('scanner') private readonly scannerQueue: Queue,
  ) {}
  // Swing (kripto + forex) tamamen kaldirildi - sadece Day-Trade taramalari kalir.
  // jobId ScannerScheduler ile AYNI SABIT deger - cron tick'i ile manuel
  // "Şimdi Tara" (veya cift tiklama) ayni tur taramanin ayni anda iki kez
  // calismasini onlemek icin (bkz. ScannerScheduler yorumu, kok sebep
  // 2026-08-23 OPUSDT duplicate sinyal vakasi).
  @Post('scan/day-trade')
  async runDayTradeScan() {
    await this.scannerQueue.add('day-trade-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 }, jobId: 'day-trade-scan' });
    return { message: 'Day Trade taraması (ICT/SMC Breakout & Retest, kripto) kuyruğa eklendi.' };
  }
  // Test Flow: ORCA ACS ile birebir aynı kural motoru + order flow teyidi.
  // Toggle kapalıyken bile admin manuel tetikleyebilir (ORCA ACS'nin "Şimdi
  // Tara" davranışıyla tutarlı - toggle sadece otomatik/periyodik taramayı kapatır).
  @Post('scan/day-trade/order-flow')
  async runDayTradeOrderFlowScan() {
    await this.scannerQueue.add('day-trade-order-flow-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 }, jobId: 'day-trade-order-flow-scan' });
    return { message: 'Test Flow taraması (ICT/SMC Breakout & Retest + Order Flow, kripto) kuyruğa eklendi.' };
  }
  @Post('scan/forex/day-trade')
  async runForexDayTradeScan() {
    await this.scannerQueue.add('forex-day-trade-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 }, jobId: 'forex-day-trade-scan' });
    return { message: 'Forex Day Trade taraması (ICT likidite süpürme) kuyruğa eklendi.' };
  }
  @Get('last')
  getLastScan(@Query('market') market?: string, @Query('strategy') strategy?: string) {
    const m = market || 'CRYPTO';
    return this.scannerService.getLastScan('DAY', m, resolveStrategyName(m, strategy));
  }
  @Get('price/:symbol')
  getLivePrice(@Param('symbol') symbol: string, @Query('market') market?: string) {
    return this.scannerService.getLivePrice(symbol, market || 'CRYPTO');
  }
  @Get('tracked')
  getTrackedSignals(@Query('market') market?: string, @Query('strategy') strategy?: string) {
    const m = market || 'CRYPTO';
    return this.scannerService.getTrackedSignals('DAY', m, resolveStrategyName(m, strategy));
  }

  // Kripto strateji degisikligi (Supply/Demand -> ICT/SMC Breakout & Retest)
  // sonrasi eski kripto sinyallerini bir kez temizlemek icin. Forex'e dokunmaz.
  @Delete('tracked/crypto')
  async clearCryptoSignals() {
    return this.scannerService.clearCryptoSignals();
  }

  // ORCA ACS ile Test Flow'un (ikisi de CRYPTO) sinyal/istatistik gecmisini
  // sifirlar, ikisi AYNI ANDA sifirdan baslasin diye - Money Maker'in gercek
  // Binance pozisyonlarina/emirlerine dokunmaz (bkz. scannerService.resetStrategyComparison).
  @Delete('tracked/crypto/strategy-comparison')
  async resetStrategyComparison() {
    return this.scannerService.resetStrategyComparison();
  }

  @Get('config')
  getScannerConfig() {
    return this.scannerService.getScannerConfig();
  }
  @Patch('config')
  updateScannerConfig(@Body() body: { orderFlowTestEnabled?: boolean; cryptoSignalNotificationsEnabled?: boolean }) {
    return this.scannerService.updateScannerConfig(body);
  }
}
