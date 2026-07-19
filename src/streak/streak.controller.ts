import { Controller, Post, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { StreakService } from './streak.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('streak')
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  @Post('ping')
  ping(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.streakService.ping(userId);
  }

  @Patch('goal')
  updateGoal(@Req() req: Request, @Body('streakGoalDays') streakGoalDays: number) {
    const userId = (req.user as any).id;
    return this.streakService.updateGoal(userId, streakGoalDays);
  }
}
