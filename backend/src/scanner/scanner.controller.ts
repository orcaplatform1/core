import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScannerService } from './scanner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('scanner')
export class ScannerController {
  constructor(
    private readonly scannerService: ScannerService,
    @InjectQueue('scanner') private readonly scannerQueue: Queue,
  ) {}
  // Swing (kripto + forex) tamamen kaldirildi - sadece Day-Trade taramalari kalir.
  @Post('scan/day-trade')
  async runDayTradeScan() {
    await this.scannerQueue.add('day-trade-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
    return { message: 'Day Trade taraması (ICT/SMC Breakout & Retest, kripto) kuyruğa eklendi.' };
  }
  @Post('scan/forex/day-trade')
  async runForexDayTradeScan() {
    await this.scannerQueue.add('forex-day-trade-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
    return { message: 'Forex Day Trade taraması (ICT likidite süpürme) kuyruğa eklendi.' };
  }
  @Get('last')
  getLastScan(@Query('market') market?: string) {
    return this.scannerService.getLastScan('DAY', market || 'CRYPTO');
  }
  @Get('price/:symbol')
  getLivePrice(@Param('symbol') symbol: string, @Query('market') market?: string) {
    return this.scannerService.getLivePrice(symbol, market || 'CRYPTO');
  }
  @Get('tracked')
  getTrackedSignals(@Query('market') market?: string) {
    return this.scannerService.getTrackedSignals('DAY', market || 'CRYPTO');
  }

  // Kripto strateji degisikligi (Supply/Demand -> ICT/SMC Breakout & Retest)
  // sonrasi eski kripto sinyallerini bir kez temizlemek icin. Forex'e dokunmaz.
  @Delete('tracked/crypto')
  async clearCryptoSignals() {
    return this.scannerService.clearCryptoSignals();
  }
}
