import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WhaleTrackerService } from './whale-tracker.service';

@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller('tools/crypto/whales')
export class WhaleTrackerController {
  constructor(private readonly whaleTrackerService: WhaleTrackerService) {}

  @Get()
  getRecentActivity() {
    return this.whaleTrackerService.getRecentActivity();
  }
}
