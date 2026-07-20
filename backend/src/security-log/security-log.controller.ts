import { Controller, Get, UseGuards } from '@nestjs/common';
import { SecurityLogService } from './security-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('security-log')
export class SecurityLogController {
  constructor(private readonly securityLogService: SecurityLogService) {}

  @Get()
  findAll() {
    return this.securityLogService.findAll();
  }
}
