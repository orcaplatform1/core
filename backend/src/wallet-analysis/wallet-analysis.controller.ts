import { Body, Controller, HttpException, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RedisCacheService } from '../cache/redis-cache.service';
import { AnalyzeWalletDto } from './dto/analyze-wallet.dto';
import { WalletAnalysisService } from './wallet-analysis.service';

const PER_USER_RATE_LIMIT_SECONDS = 60;

// Etherscan free tier kotası düşük — global IP bazlı @Throttle'a ek olarak,
// giriş yapmış kullanıcı başına dakikada 1 sorgu sınırı de var (dm.service.ts'teki
// Redis SET+EX rate-limit deseniyle aynı yaklaşım).
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('tools/crypto/wallet-analysis')
export class WalletAnalysisController {
  constructor(
    private readonly walletAnalysisService: WalletAnalysisService,
    private readonly redisCache: RedisCacheService,
  ) {}

  @Post()
  async analyze(@Req() req: Request, @Body() dto: AnalyzeWalletDto) {
    const userId = (req.user as any).id;
    const rateLimitKey = `wallet-analysis:ratelimit:${userId}`;

    const recentlyQueried = await this.redisCache.getJson<boolean>(rateLimitKey);
    if (recentlyQueried) {
      throw new HttpException(
        'Bu araç için dakikada 1 sorgu sınırı var, lütfen biraz bekleyip tekrar deneyin.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.redisCache.setJson(rateLimitKey, true, PER_USER_RATE_LIMIT_SECONDS);

    return this.walletAnalysisService.analyzeWallet(dto.address);
  }
}
