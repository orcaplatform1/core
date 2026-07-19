import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StreakService {
  constructor(private readonly prisma: PrismaService) {}

  async ping(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return null;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let newStreak = user.currentStreak;

    if (!user.lastActivityDate) {
      newStreak = 1;
    } else {
      const last = user.lastActivityDate;
      const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
      const diffDays = Math.round((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        newStreak = user.currentStreak;
      } else if (diffDays === 1) {
        newStreak = user.currentStreak + 1;
      } else {
        newStreak = 1;
      }
    }

    const newLongest = Math.max(newStreak, user.longestStreak);

    return this.prisma.user.update({
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
      },
    });
  }
}
