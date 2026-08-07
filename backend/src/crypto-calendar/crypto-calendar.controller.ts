import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CryptoCalendarService } from './crypto-calendar.service';

// Anonim ziyaretciler de erisebilir (bkz. public-tools.controller.ts'teki ayni gerekce).
@UseGuards(OptionalJwtAuthGuard)
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
