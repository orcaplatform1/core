import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PointsService {
  constructor(private readonly prisma: PrismaService) {}

  async award(userId: string, amount: number) {
    if (amount <= 0) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        periodPoints: { increment: amount },
        totalPoints: { increment: amount },
      },
    });
  }

  async getLeaderboard() {
    const users = await this.prisma.user.findMany({
      where: { periodPoints: { gt: 0 } },
      orderBy: { periodPoints: 'desc' },
      take: 20,
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        periodPoints: true,
        totalPoints: true,
      },
    });
    return users.map((u, i) => ({ rank: i + 1, ...u }));
  }

  async resetPeriodPoints() {
    await this.prisma.user.updateMany({
      data: { periodPoints: 0 },
    });
  }
}
