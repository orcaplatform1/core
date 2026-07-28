import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IcoTrackerService } from './ico-tracker.service';

// Giriş yapmış her rol (GUEST dahil) erişebilir — Araçlar sayfasındaki diğer
// crypto uçlarıyla aynı erişim/rate-limit kuralları geçerli.
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller('tools/crypto/ico')
export class IcoTrackerController {
  constructor(private readonly icoTracker: IcoTrackerService) {}

  @Get()
  getIcos() {
    return this.icoTracker.getIcos();
  }
}
