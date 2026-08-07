import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { NewsSentimentService } from './news-sentiment.service';

// Anonim ziyaretciler de erisebilir (bkz. public-tools.controller.ts'teki ayni gerekce).
@UseGuards(OptionalJwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller('tools/crypto/sentiment')
export class NewsSentimentController {
  constructor(private readonly newsSentimentService: NewsSentimentService) {}

  @Get()
  getOverview() {
    return this.newsSentimentService.getOverview();
  }
}
