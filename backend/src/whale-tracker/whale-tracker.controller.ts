import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WhaleTrackerService } from './whale-tracker.service';

// GET anonim ziyaretcilere de acik (bkz. public-tools.controller.ts'teki ayni
// gerekce); POST /sync kendi method-level JwtAuthGuard+RolesGuard'ini koruyor.
@UseGuards(OptionalJwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller('tools/crypto/whales')
export class WhaleTrackerController {
  constructor(private readonly whaleTrackerService: WhaleTrackerService) {}

  @Get()
  getRecentActivity() {
    return this.whaleTrackerService.getRecentActivity();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('sync')
  syncTopAddresses() {
    return this.whaleTrackerService.syncTopAddresses();
  }
}
