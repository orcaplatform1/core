import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NOT_DELETED_USER_WHERE } from '../common/deleted-user';

@Injectable()
export class ManageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
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
      where: NOT_DELETED_USER_WHERE,
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
    actorId: string,
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

    const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { fullName: true } });
    const broadcast = await this.prisma.announcementBroadcast.create({
      data: { title, message, target, link, createdByName: actor?.fullName },
    });

    await this.notificationsService.createForManyUsers(userIds, {
      type: 'ANNOUNCEMENT',
      title,
      message,
      link,
      broadcastId: broadcast.id,
    });

    await this.auditLogService.log(actorId, 'ANNOUNCEMENT_BROADCAST', 'Notification', undefined, {
      title,
      target,
      recipientCount: userIds.length,
    });

    return { message: `${userIds.length} kullanıcıya duyuru gönderildi.`, target };
  }

  async listAnnouncementBroadcasts() {
    const broadcasts = await this.prisma.announcementBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { notifications: true } } },
    });
    return broadcasts.map((b) => ({
      id: b.id,
      title: b.title,
      message: b.message,
      target: b.target,
      link: b.link,
      createdByName: b.createdByName,
      createdAt: b.createdAt,
      recipientCount: b._count.notifications,
    }));
  }

  async deleteAnnouncementBroadcast(id: string, actorId: string) {
    const broadcast = await this.prisma.announcementBroadcast.findUnique({ where: { id } });
    if (!broadcast) {
      throw new NotFoundException('Duyuru bulunamadı.');
    }
    // Notification satırları AnnouncementBroadcast'a onDelete: Cascade ile bağlı —
    // duyuruyu silmek kullanıcıların gelen kutusundan da otomatik kaldırır.
    await this.prisma.announcementBroadcast.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'ANNOUNCEMENT_DELETE', 'AnnouncementBroadcast', id, { title: broadcast.title });
    return { message: 'Duyuru silindi.' };
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

  async makeStaff(userId: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    if (user.role === 'STAFF') {
      throw new BadRequestException('Bu kullanıcı zaten personel.');
    }

    const promoCode = await this.generatePromoCode(user.fullName);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'STAFF', promoCode, avatarUrl: 'https://traders.tr/avatars/admin-staff.png' },
      select: { id: true, fullName: true, role: true, promoCode: true },
    });

    await this.auditLogService.log(actorId, 'USER_PROMOTE_TO_STAFF', 'User', userId, { promoCode });

    return updated;
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

  async getSignupsTrend(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return this.prisma.$queryRaw`
      SELECT DATE_TRUNC('day', "createdAt")::date AS date, COUNT(*)::int AS count
      FROM "User"
      WHERE "createdAt" >= ${startDate}
      GROUP BY date
      ORDER BY date ASC
    `;
  }

  async getRevenueTrend(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return this.prisma.$queryRaw`
      SELECT DATE_TRUNC('day', COALESCE("approvedAt", "createdAt"))::date AS date, SUM(amount)::float AS revenue
      FROM "Payment"
      WHERE status = 'APPROVED' AND COALESCE("approvedAt", "createdAt") >= ${startDate}
      GROUP BY date
      ORDER BY date ASC
    `;
  }

  async getReferralOverview() {
    const referrers = await this.prisma.user.findMany({
      where: { referrals: { some: {} } },
      select: {
        id: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        referralCreditsEarned: true,
        _count: { select: { referrals: true } },
      },
      orderBy: { referralCreditsEarned: 'desc' },
    });
    return referrers.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      username: r.username,
      avatarUrl: r.avatarUrl,
      invitedCount: r._count.referrals,
      creditsEarned: r.referralCreditsEarned,
    }));
  }

  async getReferralInvitees(userId: string) {
    return this.prisma.user.findMany({
      where: { referredByUserId: userId },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReferralEarningsStats() {
    const REFERRAL_CREDIT_REWARD = 50;
    const withCredits = (rows: { period: Date; count: number }[]) =>
      rows.map((r) => ({ ...r, creditsAwarded: r.count * REFERRAL_CREDIT_REWARD }));

    const [daily, monthly, yearly] = await Promise.all([
      this.prisma.$queryRaw<{ period: Date; count: number }[]>`
        SELECT DATE_TRUNC('day', COALESCE("approvedAt", "createdAt"))::date AS period, COUNT(*)::int AS count
        FROM "Payment"
        WHERE status = 'APPROVED' AND "referralType" = 'STUDENT' AND COALESCE("approvedAt", "createdAt") >= NOW() - INTERVAL '30 days'
        GROUP BY period ORDER BY period ASC
      `,
      this.prisma.$queryRaw<{ period: Date; count: number }[]>`
        SELECT DATE_TRUNC('month', COALESCE("approvedAt", "createdAt"))::date AS period, COUNT(*)::int AS count
        FROM "Payment"
        WHERE status = 'APPROVED' AND "referralType" = 'STUDENT' AND COALESCE("approvedAt", "createdAt") >= NOW() - INTERVAL '12 months'
        GROUP BY period ORDER BY period ASC
      `,
      this.prisma.$queryRaw<{ period: Date; count: number }[]>`
        SELECT DATE_TRUNC('year', COALESCE("approvedAt", "createdAt"))::date AS period, COUNT(*)::int AS count
        FROM "Payment"
        WHERE status = 'APPROVED' AND "referralType" = 'STUDENT' AND COALESCE("approvedAt", "createdAt") >= NOW() - INTERVAL '5 years'
        GROUP BY period ORDER BY period ASC
      `,
    ]);

    return { daily: withCredits(daily), monthly: withCredits(monthly), yearly: withCredits(yearly) };
  }

  async getPackageSalesStats() {
    const [daily, monthly, yearly] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT DATE_TRUNC('day', COALESCE("approvedAt", "createdAt"))::date AS period, SUM(amount)::float AS revenue, COUNT(*)::int AS count
        FROM "Payment"
        WHERE status = 'APPROVED' AND purpose = 'PROGRAM' AND COALESCE("approvedAt", "createdAt") >= NOW() - INTERVAL '30 days'
        GROUP BY period ORDER BY period ASC
      `,
      this.prisma.$queryRaw`
        SELECT DATE_TRUNC('month', COALESCE("approvedAt", "createdAt"))::date AS period, SUM(amount)::float AS revenue, COUNT(*)::int AS count
        FROM "Payment"
        WHERE status = 'APPROVED' AND purpose = 'PROGRAM' AND COALESCE("approvedAt", "createdAt") >= NOW() - INTERVAL '12 months'
        GROUP BY period ORDER BY period ASC
      `,
      this.prisma.$queryRaw`
        SELECT DATE_TRUNC('year', COALESCE("approvedAt", "createdAt"))::date AS period, SUM(amount)::float AS revenue, COUNT(*)::int AS count
        FROM "Payment"
        WHERE status = 'APPROVED' AND purpose = 'PROGRAM' AND COALESCE("approvedAt", "createdAt") >= NOW() - INTERVAL '5 years'
        GROUP BY period ORDER BY period ASC
      `,
    ]);
    return { daily, monthly, yearly };
  }

  async getTopPrograms(limit = 5) {
    const grouped = await this.prisma.enrollment.groupBy({
      by: ['programId'],
      _count: { _all: true },
      orderBy: { _count: { programId: 'desc' } },
      take: limit,
    });
    const programIds = grouped.map((g) => g.programId);
    const programs = await this.prisma.program.findMany({
      where: { id: { in: programIds } },
      select: { id: true, title: true },
    });
    const programMap = new Map(programs.map((p) => [p.id, p.title]));
    return grouped.map((g) => ({
      programId: g.programId,
      title: programMap.get(g.programId) ?? 'Bilinmeyen Program',
      enrollmentCount: g._count._all,
    }));
  }

  async getCompletionRate() {
    const [totalLessonProgress, completedLessonProgress] = await Promise.all([
      this.prisma.progress.count({ where: { lessonId: { not: null } } }),
      this.prisma.progress.count({ where: { lessonId: { not: null }, completed: true } }),
    ]);
    const rate = totalLessonProgress > 0 ? (completedLessonProgress / totalLessonProgress) * 100 : 0;
    return {
      totalLessonProgress,
      completedLessonProgress,
      completionRatePercent: Math.round(rate * 10) / 10,
    };
  }

  async getQuizStats() {
    const [totalAttempts, passedAttempts, avgScore] = await Promise.all([
      this.prisma.quizAttempt.count({ where: { expired: false } }),
      this.prisma.quizAttempt.count({ where: { expired: false, passed: true } }),
      this.prisma.quizAttempt.aggregate({
        where: { expired: false },
        _avg: { score: true },
      }),
    ]);
    const passRate = totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0;
    return {
      totalAttempts,
      passedAttempts,
      passRatePercent: Math.round(passRate * 10) / 10,
      averageScore: Math.round((avgScore._avg.score ?? 0) * 10) / 10,
    };
  }
}
