import { Controller, Get, Post, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScannerService } from './scanner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// Test Flow (ICT_BREAKOUT_RETEST_OF) varyanti kaldirildi (kullanici istegi:
// "test flow boktan cikti") - CRYPTO'da artik tek strateji (ORCA ACS) var.
function resolveStrategyName(market: string): string {
  if (market === 'FOREX') return 'FX_LIQUIDITY_SWEEP';
  return 'ICT_BREAKOUT_RETEST';
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
    await this.scannerQueue.add('day-trade-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 }, jobId: 'day-trade-scan', removeOnComplete: true, removeOnFail: true });
    return { message: 'Day Trade taraması (ICT/SMC Breakout & Retest, kripto) kuyruğa eklendi.' };
  }
  @Post('scan/forex/day-trade')
  async runForexDayTradeScan() {
    await this.scannerQueue.add('forex-day-trade-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 }, jobId: 'forex-day-trade-scan', removeOnComplete: true, removeOnFail: true });
    return { message: 'Forex Day Trade taraması (ICT likidite süpürme) kuyruğa eklendi.' };
  }
  @Get('last')
  getLastScan(@Query('market') market?: string) {
    const m = market || 'CRYPTO';
    return this.scannerService.getLastScan('DAY', m, resolveStrategyName(m));
  }
  @Get('price/:symbol')
  getLivePrice(@Param('symbol') symbol: string, @Query('market') market?: string) {
    return this.scannerService.getLivePrice(symbol, market || 'CRYPTO');
  }
  @Get('tracked')
  getTrackedSignals(@Query('market') market?: string) {
    const m = market || 'CRYPTO';
    return this.scannerService.getTrackedSignals('DAY', m, resolveStrategyName(m));
  }

  // Kripto strateji degisikligi (Supply/Demand -> ICT/SMC Breakout & Retest)
  // sonrasi eski kripto sinyallerini bir kez temizlemek icin. Forex'e dokunmaz.
  @Delete('tracked/crypto')
  async clearCryptoSignals() {
    return this.scannerService.clearCryptoSignals();
  }

  // Test Flow kaldirildiktan sonra bu artik sadece ORCA ACS'nin sonuclanmis
  // (closedAt dolu) sinyal/istatistik gecmisini sifirlar - Money Maker'in
  // gercek Binance pozisyonlarina/emirlerine dokunmaz (bkz. scannerService.resetStrategyComparison).
  @Delete('tracked/crypto/strategy-comparison')
  async resetStrategyComparison() {
    return this.scannerService.resetStrategyComparison();
  }

  @Get('config')
  getScannerConfig() {
    return this.scannerService.getScannerConfig();
  }
  @Patch('config')
  updateScannerConfig(@Body() body: { cryptoSignalNotificationsEnabled?: boolean }) {
    return this.scannerService.updateScannerConfig(body);
  }
}
