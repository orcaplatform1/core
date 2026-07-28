import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CryptoCalendarService } from './crypto-calendar.service';

@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller('tools/crypto/calendar')
export class CryptoCalendarController {
  constructor(private readonly cryptoCalendarService: CryptoCalendarService) {}

  @Get()
  getUpcoming(@Query('days') days?: string) {
    const parsed = days ? parseInt(days, 10) : NaN;
    const resolvedDays = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
    return this.cryptoCalendarService.getUpcoming(resolvedDays);
  }
}
