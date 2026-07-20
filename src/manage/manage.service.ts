import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ManageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getGenderStats() {
    const [male, female, total] = await Promise.all([
      this.prisma.user.count({ where: { gender: 'ERKEK' } }),
      this.prisma.user.count({ where: { gender: 'KADIN' } }),
      this.prisma.user.count(),
    ]);

    return { male, female, unspecified: total - male - female, total };
  }

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

  async broadcastAnnouncement(
    title: string,
    message: string,
    target: 'ALL' | 'PAID' | 'FREE',
    link?: string,
  ) {
    let userIds: string[];

    if (target === 'ALL') {
      const users = await this.prisma.user.findMany({ select: { id: true } });
      userIds = users.map((u) => u.id);
    } else {
      const enrolledUserIds = await this.prisma.enrollment.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });
      const enrolledSet = new Set(enrolledUserIds.map((e) => e.userId));

      const allUsers = await this.prisma.user.findMany({ select: { id: true } });

      if (target === 'PAID') {
        userIds = allUsers.filter((u) => enrolledSet.has(u.id)).map((u) => u.id);
      } else {
        userIds = allUsers.filter((u) => !enrolledSet.has(u.id)).map((u) => u.id);
      }
    }

    await this.notificationsService.createForManyUsers(userIds, {
      type: 'ANNOUNCEMENT',
      title,
      message,
      link,
    });

    return { message: `${userIds.length} kullanıcıya duyuru gönderildi.`, target };
  }

  private async generatePromoCode(fullName: string): Promise<string> {
    const base = fullName
      .split(' ')[0]
      .toUpperCase()
      .replace(/[^A-ZÇĞİÖŞÜ]/g, '');

    let attempt = 1;
    let code = `${base}${attempt}`;

    while (await this.prisma.user.findUnique({ where: { promoCode: code } })) {
      attempt++;
      code = `${base}${attempt}`;
    }

    return code;
  }

  async makeStaff(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    if (user.role === 'STAFF') {
      throw new BadRequestException('Bu kullanıcı zaten personel.');
    }

    const promoCode = await this.generatePromoCode(user.fullName);

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: 'STAFF', promoCode, avatarUrl: 'https://traders.tr/avatars/admin-staff.png' },
      select: { id: true, fullName: true, role: true, promoCode: true },
    });
  }

  async getStaffPerformance() {
    const staffMembers = await this.prisma.user.findMany({
      where: { role: 'STAFF' },
      select: { id: true, fullName: true, promoCode: true },
    });

    const results = [];

    for (const staff of staffMembers) {
      const [testsGiven, conversions, payments, commissions] = await Promise.all([
        this.prisma.lead.count({ where: { staffPromoCode: staff.promoCode ?? '' } }),
        this.prisma.lead.count({
          where: { staffPromoCode: staff.promoCode ?? '', convertedUserId: { not: null } },
        }),
        this.prisma.payment.count({
          where: { referredByStaffId: staff.id, status: 'APPROVED' },
        }),
        this.prisma.commission.aggregate({
          where: { staffId: staff.id },
          _sum: { amount: true },
        }),
      ]);

      results.push({
        staffId: staff.id,
        fullName: staff.fullName,
        promoCode: staff.promoCode,
        testsGiven,
        conversions,
        notConvertedYet: testsGiven - conversions,
        totalSales: payments,
        totalCommission: commissions._sum.amount ?? 0,
      });
    }

    return results;
  }
}
