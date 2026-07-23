import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
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

  @Get('last')
  getLastScan() {
    return this.scannerService.getLastScan();
  }

  @Get('price/:symbol')
  getLivePrice(@Param('symbol') symbol: string) {
    return this.scannerService.getLivePrice(symbol);
  }

  @Get('tracked')
  getTrackedSignals() {
    return this.scannerService.getTrackedSignals();
  }
}
