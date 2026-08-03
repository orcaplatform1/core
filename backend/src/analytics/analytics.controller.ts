import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { TrackVisitDto } from './dto/track-visit.dto';

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('public/track-visit')
  trackVisit(@Body() dto: TrackVisitDto) {
    return this.analyticsService.trackVisit(dto.visitorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Get('manage/analytics/visitors')
  getVisitorStats() {
    return this.analyticsService.getVisitorStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Get('manage/analytics/role-counts')
  getRoleCounts() {
    return this.analyticsService.getRoleCounts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Get('manage/analytics/guests')
  getGuestList(@Query('page') page?: string) {
    return this.analyticsService.getGuestList(page ? parseInt(page, 10) : 1);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Get('manage/analytics/active-users')
  getActiveUsers() {
    return this.analyticsService.getActiveUsers();
  }
}
