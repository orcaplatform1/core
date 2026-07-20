import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  private getWeekStart(date: Date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  private lockedStatsResponse() {
    return {
      locked: true,
      unlockMessage:
        '🔒 İstatistiklerin seni bekliyor! Bir eğitim satın aldığın anda finans skorun, quiz başarı oranın, backtest performansın ve kişisel gelişim raporun burada canlanmaya başlayacak. Potansiyelini görmeye hazır mısın?',
      overallScore: 0,
      previousWeekScore: null,
      educationCompletionRate: 0,
      quizSuccessRate: 0,
      backtestSuccessRate: 0,
      simulationReturnRate: 0,
      badgeCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      dailyGoal: { target: 1, completed: 0 },
      weeklyGoal: { target: 5, completed: 0 },
    };
  }

  async getMyStats(userId: string) {
    const enrollmentCount = await this.prisma.enrollment.count({ where: { userId } });

    if (enrollmentCount === 0) {
      return this.lockedStatsResponse();
    }

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

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentWeekStart = this.getWeekStart(now);
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    const lessonsToday = progressRows.filter(
      (p) => p.completed && p.updatedAt >= startOfDay,
    ).length;

    const lessonsThisWeek = progressRows.filter(
      (p) => p.completed && p.updatedAt >= currentWeekStart,
    ).length;

    await this.prisma.statsSnapshot.upsert({
      where: { userId_weekStart: { userId, weekStart: currentWeekStart } },
      update: { overallScore },
      create: { userId, weekStart: currentWeekStart, overallScore },
    });

    const previousSnapshot = await this.prisma.statsSnapshot.findUnique({
      where: { userId_weekStart: { userId, weekStart: previousWeekStart } },
    });

    return {
      locked: false,
      unlockMessage: null,
      overallScore,
      previousWeekScore: previousSnapshot?.overallScore ?? null,
      educationCompletionRate,
      quizSuccessRate,
      backtestSuccessRate,
      simulationReturnRate: simReturnRate,
      badgeCount: badges,
      currentStreak: user?.currentStreak ?? 0,
      longestStreak: user?.longestStreak ?? 0,
      dailyGoal: {
        target: user?.dailyGoalLessons ?? 1,
        completed: lessonsToday,
      },
      weeklyGoal: {
        target: user?.weeklyGoalLessons ?? 5,
        completed: lessonsThisWeek,
      },
    };
  }

  async getCategoryBreakdown(userId: string) {
    const enrollmentCount = await this.prisma.enrollment.count({ where: { userId } });
    if (enrollmentCount === 0) return [];

    const categories = await this.prisma.category.findMany({
      include: {
        programs: {
          include: {
            modules: {
              include: {
                lessons: {
                  include: { quizzes: true },
                },
              },
            },
          },
        },
      },
    });

    const results = [];

    for (const category of categories) {
      const lessons = category.programs.flatMap((p) =>
        p.modules.flatMap((m) => m.lessons),
      );

      if (lessons.length === 0) continue;

      const lessonIds = lessons.map((l) => l.id);

      const progressRows = await this.prisma.progress.findMany({
        where: { userId, lessonId: { in: lessonIds } },
      });

      const completed = progressRows.filter((p) => p.completed).length;
      const percentage = Math.round((completed / lessons.length) * 100);

      results.push({
        categoryId: category.id,
        categoryName: category.name,
        completedLessons: completed,
        totalLessons: lessons.length,
        percentage,
      });
    }

    return results.sort((a, b) => b.percentage - a.percentage);
  }

  async getTodayRecommendations(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({ where: { userId } });

    const recommendations = [];

    for (const enrollment of enrollments) {
      const modules = await this.prisma.module.findMany({
        where: { programId: enrollment.programId },
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' } } },
      });

      let found = null;

      for (const mod of modules) {
        for (const lesson of mod.lessons) {
          const progress = await this.prisma.progress.findUnique({
            where: { userId_lessonId: { userId, lessonId: lesson.id } },
          });

          if (!progress || !progress.completed) {
            found = {
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              moduleId: mod.id,
              moduleTitle: mod.title,
              programId: enrollment.programId,
              estimatedMinutes: lesson.durationSeconds
                ? Math.round(lesson.durationSeconds / 60)
                : null,
            };
            break;
          }
        }
        if (found) break;
      }

      if (found) recommendations.push(found);
    }

    return recommendations.slice(0, 5);
  }

  async getBacktestChart(userId: string) {
    const trades = await this.prisma.backtestTrade.findMany({
      where: { userId, status: 'CLOSED' },
      orderBy: { exitDate: 'asc' },
    });

    let cumulative = 0;
    const points = trades.map((t) => {
      cumulative += t.pnl ?? 0;
      return { date: t.exitDate, cumulativePnl: cumulative };
    });

    return points;
  }

  async getSimulationChart(userId: string) {
    const account = await this.prisma.simulationAccount.findUnique({
      where: { userId },
      include: { trades: { where: { status: 'CLOSED' }, orderBy: { closedAt: 'asc' } } },
    });

    if (!account) return [];

    let cumulative = 0;
    const points = account.trades.map((t) => {
      cumulative += t.pnl ?? 0;
      return { date: t.closedAt, cumulativePnl: cumulative };
    });

    return points;
  }

  async updateGoals(userId: string, dailyGoalLessons?: number, weeklyGoalLessons?: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { dailyGoalLessons, weeklyGoalLessons },
      select: { dailyGoalLessons: true, weeklyGoalLessons: true },
    });
  }
}
