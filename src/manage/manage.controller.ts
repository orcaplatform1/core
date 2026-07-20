import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ManageService } from './manage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
    @Body('title') title: string,
    @Body('message') message: string,
    @Body('target') target: 'ALL' | 'PAID' | 'FREE',
    @Body('link') link?: string,
  ) {
    return this.manageService.broadcastAnnouncement(title, message, target, link);
  }

  @Post('staff/:id')
  makeStaff(@Param('id') id: string) {
    return this.manageService.makeStaff(id);
  }

  @Get('staff/performance')
  getStaffPerformance() {
    return this.manageService.getStaffPerformance();
  }
}
