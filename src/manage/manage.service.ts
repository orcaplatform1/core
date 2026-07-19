import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ManageService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      totalUsers,
      activeEnrollments,
      pendingPayments,
      approvedPaymentsSum,
      bannedUsers,
      totalPrograms,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.enrollment.count(),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
      }),
      this.prisma.user.count({ where: { bannedUntil: { gt: new Date() } } }),
      this.prisma.program.count(),
    ]);

    return {
      totalUsers,
      activeEnrollments,
      pendingPayments,
      totalRevenue: approvedPaymentsSum._sum.amount ?? 0,
      bannedUsers,
      totalPrograms,
    };
  }

  async getPendingPayments() {
    return this.prisma.payment.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getRecentUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        bannedUntil: true,
        banCount: true,
        createdAt: true,
      },
    });
  }
}
