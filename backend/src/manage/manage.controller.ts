import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ManageService } from './manage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BroadcastAnnouncementDto } from './dto/broadcast-announcement.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('manage')
export class ManageController {
  constructor(private readonly manageService: ManageService) {}

  @Get('dashboard')
  getDashboard() {
    return this.manageService.getDashboard();
  }

  @Get('users/gender-stats')
  getGenderStats() {
    return this.manageService.getGenderStats();
  }

  @Get('payments/pending')
  getPendingPayments() {
    return this.manageService.getPendingPayments();
  }

  @Get('users/recent')
  getRecentUsers() {
    return this.manageService.getRecentUsers();
  }

  @Post('announcements')
  broadcastAnnouncement(
    @Req() req: Request,
    @Body() dto: BroadcastAnnouncementDto,
  ) {
    const actorId = (req.user as any).id;
    return this.manageService.broadcastAnnouncement(dto.title, dto.message, dto.target, actorId, dto.link);
  }

  @Post('staff/:id')
  makeStaff(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.manageService.makeStaff(id, actorId);
  }

  @Get('staff/performance')
  getStaffPerformance() {
    return this.manageService.getStaffPerformance();
  }

  @Get('stats/signups')
  getSignupsTrend() {
    return this.manageService.getSignupsTrend();
  }

  @Get('stats/revenue')
  getRevenueTrend() {
    return this.manageService.getRevenueTrend();
  }

  @Get('stats/top-programs')
  getTopPrograms() {
    return this.manageService.getTopPrograms();
  }

  @Get('stats/completion-rate')
  getCompletionRate() {
    return this.manageService.getCompletionRate();
  }

  @Get('stats/quiz')
  getQuizStats() {
    return this.manageService.getQuizStats();
  }
}
