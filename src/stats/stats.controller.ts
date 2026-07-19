import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('me')
  getMyStats(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.statsService.getMyStats(userId);
  }
}
