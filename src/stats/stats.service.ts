import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyStats(userId: string) {
    const [progressRows, quizAttempts, backtestTrades, simTrades, badges, user] =
      await Promise.all([
        this.prisma.progress.findMany({ where: { userId } }),
        this.prisma.quizAttempt.findMany({ where: { userId } }),
        this.prisma.backtestTrade.findMany({ where: { userId, status: 'CLOSED' } }),
        this.prisma.simulationAccount.findUnique({
          where: { userId },
          include: { trades: { where: { status: 'CLOSED' } } },
        }),
        this.prisma.userBadge.count({ where: { userId } }),
        this.prisma.user.findUnique({ where: { id: userId } }),
      ]);

    const completedLessons = progressRows.filter((p) => p.completed).length;
    const totalTrackedLessons = progressRows.length;
    const educationCompletionRate =
      totalTrackedLessons > 0
        ? Math.round((completedLessons / totalTrackedLessons) * 100)
        : 0;

    const quizSuccessRate =
      quizAttempts.length > 0
        ? Math.round(
            quizAttempts.reduce((sum, a) => sum + a.percentage, 0) / quizAttempts.length,
          )
        : 0;

    const backtestWins = backtestTrades.filter((t) => (t.pnl ?? 0) > 0).length;
    const backtestSuccessRate =
      backtestTrades.length > 0
        ? Math.round((backtestWins / backtestTrades.length) * 100)
        : 0;

    const simTradesClosedList = simTrades?.trades ?? [];
    const simTotalPnl = simTradesClosedList.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const simReturnRate =
      simTrades && simTrades.balance > 0
        ? Math.round((simTotalPnl / (simTrades.balance - simTotalPnl)) * 1000) / 10
        : 0;

    const overallScore = Math.round(
      (educationCompletionRate + quizSuccessRate + backtestSuccessRate) / 3,
    );

    return {
      overallScore,
      educationCompletionRate,
      quizSuccessRate,
      backtestSuccessRate,
      simulationReturnRate: simReturnRate,
      badgeCount: badges,
      currentStreak: user?.currentStreak ?? 0,
      longestStreak: user?.longestStreak ?? 0,
    };
  }
}
