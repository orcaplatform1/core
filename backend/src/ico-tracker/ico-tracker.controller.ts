import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { IcoTrackerService } from './ico-tracker.service';

// Anonim ziyaretciler de erisebilir (bkz. public-tools.controller.ts'teki ayni gerekce).
@UseGuards(OptionalJwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller('tools/crypto/ico')
export class IcoTrackerController {
  constructor(private readonly icoTracker: IcoTrackerService) {}

  @Get()
  getIcos() {
    return this.icoTracker.getIcos();
  }
}
