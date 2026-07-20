import { Body, Controller, Get, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateGoalsDto } from './dto/update-goals.dto';

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('user/:userId')
  getUserStats(@Param('userId') userId: string) {
    return this.statsService.getMyStats(userId);
  }

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
    @Body() dto: UpdateGoalsDto,
  ) {
    const userId = (req.user as any).id;
    return this.statsService.updateGoals(userId, dto.dailyGoalLessons, dto.weeklyGoalLessons);
  }
}
