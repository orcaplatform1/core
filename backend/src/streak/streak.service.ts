import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { PointsService } from '../points/points.service';

const STREAK_DAY_POINTS_REWARD = 5;

@Injectable()
export class StreakService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
    private readonly pointsService: PointsService,
  ) {}

  async ping(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return null;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let newStreak = user.currentStreak;
    let isNewDay = true;

    if (!user.lastActivityDate) {
      newStreak = 1;
    } else {
      const last = user.lastActivityDate;
      const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
      const diffDays = Math.round((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        newStreak = user.currentStreak;
        isNewDay = false;
      } else if (diffDays === 1) {
        newStreak = user.currentStreak + 1;
      } else {
        newStreak = 1;
      }
    }

    const newLongest = Math.max(newStreak, user.longestStreak);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActivityDate: now,
      },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
        streakGoalDays: true,
      },
    });

    await this.badgesService.checkAndGrant(userId, 'STREAK_DAYS', newStreak);

    if (isNewDay) {
      await this.pointsService.award(userId, STREAK_DAY_POINTS_REWARD);
    }

    return updated;
  }

  async updateGoal(userId: string, streakGoalDays: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { streakGoalDays },
      select: { streakGoalDays: true },
    });
  }
}
