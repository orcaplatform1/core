import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SponsorshipsService } from './sponsorships.service';
import { RejectSponsorshipDto } from './dto/reject-sponsorship.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('manage/sponsorships')
export class AdminSponsorshipsController {
  constructor(private readonly sponsorshipsService: SponsorshipsService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.sponsorshipsService.adminList(status);
  }

  @Get('stats')
  stats() {
    return this.sponsorshipsService.getStats();
  }

  @Post(':id/approve')
  approve(@Req() req: Request, @Param('id') id: string) {
    const actor = req.user as any;
    return this.sponsorshipsService.approve(id, actor.id, actor.fullName ?? actor.username ?? 'Admin');
  }

  @Post(':id/reject')
  reject(@Req() req: Request, @Param('id') id: string, @Body() dto: RejectSponsorshipDto) {
    const actor = req.user as any;
    return this.sponsorshipsService.reject(id, actor.fullName ?? actor.username ?? 'Admin', dto.reason);
  }
}
