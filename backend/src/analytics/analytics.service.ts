import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService, PresenceUser } from '../notifications/presence.service';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function mondayStr() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Pazar
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diffToMonday);
  return monday.toISOString().slice(0, 10);
}

function monthPrefix() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
  ) {}

  async trackVisit(visitorId: string) {
    await this.prisma.visitorLog.upsert({
      where: { visitorId_date: { visitorId, date: todayStr() } },
      update: {},
      create: { visitorId, date: todayStr() },
    });
  }

  async getVisitorStats() {
    const [todayCount, weekRows, monthRows] = await Promise.all([
      this.prisma.visitorLog.count({ where: { date: todayStr() } }),
      this.prisma.visitorLog.findMany({
        where: { date: { gte: mondayStr() } },
        distinct: ['visitorId'],
        select: { visitorId: true },
      }),
      this.prisma.visitorLog.findMany({
        where: { date: { startsWith: monthPrefix() } },
        distinct: ['visitorId'],
        select: { visitorId: true },
      }),
    ]);
    return { today: todayCount, week: weekRows.length, month: monthRows.length };
  }

  async getRoleCounts() {
    const rows = await this.prisma.user.groupBy({ by: ['role'], _count: true });
    const counts: Record<string, number> = { GUEST: 0, STUDENT: 0, STAFF: 0, SUPER_ADMIN: 0 };
    for (const row of rows) counts[row.role] = row._count;
    return counts;
  }

  async getGuestList(page = 1) {
    const limit = 20;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'GUEST' },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, username: true, fullName: true, email: true, phone: true, createdAt: true },
      }),
      this.prisma.user.count({ where: { role: 'GUEST' } }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  getActiveUsers(): PresenceUser[] {
    return this.presence.getActive();
  }
}
