import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TokenUnlockService } from './token-unlock.service';

@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller('tools/crypto/unlocks')
export class TokenUnlockController {
  constructor(private readonly tokenUnlockService: TokenUnlockService) {}

  @Get()
  getUpcoming() {
    return this.tokenUnlockService.getUpcoming();
  }
}
