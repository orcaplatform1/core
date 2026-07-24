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
    await this.scannerQueue.add('hourly-scan', {});
    return { message: 'Tarama kuyruğa eklendi, arka planda çalışıyor. Birkaç dakika sonra "son tarama" sonucunu kontrol et.' };
  }
  @Post('scan/day-trade')
  async runDayTradeScan() {
    await this.scannerQueue.add('day-trade-scan', {});
    return { message: 'Day Trade taraması kuyruğa eklendi (sadece killzone saatlerinde gerçek sonuç üretir).' };
  }
  @Get('last')
  getLastScan(@Query('style') style?: string) {
    return this.scannerService.getLastScan(style || 'SWING');
  }
  @Get('price/:symbol')
  getLivePrice(@Param('symbol') symbol: string) {
    return this.scannerService.getLivePrice(symbol);
  }
  @Get('tracked')
  getTrackedSignals(@Query('style') style?: string) {
    return this.scannerService.getTrackedSignals(style || 'SWING');
  }
}
