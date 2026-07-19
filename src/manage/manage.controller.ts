import { Controller, Get, UseGuards } from '@nestjs/common';
import { ManageService } from './manage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'STAFF')
@Controller('manage')
export class ManageController {
  constructor(private readonly manageService: ManageService) {}

  @Get('dashboard')
  getDashboard() {
    return this.manageService.getDashboard();
  }

  @Get('payments/pending')
  getPendingPayments() {
    return this.manageService.getPendingPayments();
  }

  @Get('users/recent')
  getRecentUsers() {
    return this.manageService.getRecentUsers();
  }
}
