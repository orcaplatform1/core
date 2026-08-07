import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { TokenUnlockService } from './token-unlock.service';

// Anonim ziyaretciler de erisebilir (bkz. public-tools.controller.ts'teki ayni gerekce).
@UseGuards(OptionalJwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller('tools/crypto/unlocks')
export class TokenUnlockController {
  constructor(private readonly tokenUnlockService: TokenUnlockService) {}

  @Get()
  getUpcoming() {
    return this.tokenUnlockService.getUpcoming();
  }
}
