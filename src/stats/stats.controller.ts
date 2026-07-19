import { Body, Controller, Get, Patch, UseGuards, Req } from '@nestjs/common';
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

  @Get('me/categories')
  getCategoryBreakdown(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.statsService.getCategoryBreakdown(userId);
  }

  @Get('me/today')
  getTodayRecommendations(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.statsService.getTodayRecommendations(userId);
  }

  @Get('me/backtest-chart')
  getBacktestChart(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.statsService.getBacktestChart(userId);
  }

  @Get('me/simulation-chart')
  getSimulationChart(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.statsService.getSimulationChart(userId);
  }

  @Patch('me/goals')
  updateGoals(
    @Req() req: Request,
    @Body('dailyGoalLessons') dailyGoalLessons?: number,
    @Body('weeklyGoalLessons') weeklyGoalLessons?: number,
  ) {
    const userId = (req.user as any).id;
    return this.statsService.updateGoals(userId, dailyGoalLessons, weeklyGoalLessons);
  }
}
