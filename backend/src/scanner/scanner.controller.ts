import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
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
  @Post('scan')
  async runScan() {
    await this.scannerQueue.add('hourly-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
    return { message: 'Tarama kuyruğa eklendi, arka planda çalışıyor. Birkaç dakika sonra "son tarama" sonucunu kontrol et.' };
  }
  @Post('scan/day-trade')
  async runDayTradeScan() {
    await this.scannerQueue.add('day-trade-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
    return { message: 'Day Trade taraması kuyruğa eklendi (sadece killzone saatlerinde gerçek sonuç üretir).' };
  }
  @Post('scan/forex')
  async runForexScan() {
    await this.scannerQueue.add('forex-swing-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
    return { message: 'Forex taraması kuyruğa eklendi, arka planda çalışıyor.' };
  }
  @Post('scan/forex/day-trade')
  async runForexDayTradeScan() {
    await this.scannerQueue.add('forex-day-trade-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
    return { message: 'Forex Day Trade taraması kuyruğa eklendi.' };
  }
  @Get('last')
  getLastScan(@Query('style') style?: string, @Query('market') market?: string) {
    return this.scannerService.getLastScan(style || 'SWING', market || 'CRYPTO');
  }
  @Get('price/:symbol')
  getLivePrice(@Param('symbol') symbol: string, @Query('market') market?: string) {
    return this.scannerService.getLivePrice(symbol, market || 'CRYPTO');
  }
  @Get('tracked')
  getTrackedSignals(@Query('style') style?: string, @Query('market') market?: string) {
    return this.scannerService.getTrackedSignals(style || 'SWING', market || 'CRYPTO');
  }

  @Post('refresh-winrate')
  async refreshWinRate() {
    await this.scannerQueue.add('refresh-winrate', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
    return { message: 'Basari orani hesaplama kuyruga eklendi, sembol sayisina gore birkac dakika surebilir.' };
  }
}
