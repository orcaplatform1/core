import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NewsSentimentService } from './news-sentiment.service';

@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller('tools/crypto/sentiment')
export class NewsSentimentController {
  constructor(private readonly newsSentimentService: NewsSentimentService) {}

  @Get()
  getOverview() {
    return this.newsSentimentService.getOverview();
  }
}
