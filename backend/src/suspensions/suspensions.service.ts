import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export const SUSPENSION_DURATIONS_DAYS = [1, 3, 7] as const;
export type SuspensionDurationDays = (typeof SUSPENSION_DURATIONS_DAYS)[number];

@Injectable()
export class SuspensionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async issue(userId: string, type: 'COMMENT' | 'DM', days: number, issuedById: string, reason?: string) {
    if (!SUSPENSION_DURATIONS_DAYS.includes(days as SuspensionDurationDays)) {
      throw new BadRequestException('Geçersiz süre - 1, 3 veya 7 gün olmalı.');
    }
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const suspension = await this.prisma.userSuspension.create({
      data: { userId, type, expiresAt, issuedById, reason },
    });

    const kind = type === 'COMMENT' ? 'yorum' : 'mesaj';
    await this.notifications.create({
      userId,
      type: 'SYSTEM',
      title: type === 'COMMENT' ? 'Yorum yasağı aldınız' : 'Mesajlaşma yasağı aldınız',
      message: this.buildBanMessage(kind, expiresAt),
      link: '/support',
    });

    return suspension;
  }

  // Suanda aktif (suresi gecmemis) en son yaptirimi doner - yoksa null.
  async getActive(userId: string, type: 'COMMENT' | 'DM') {
    return this.prisma.userSuspension.findFirst({
      where: { userId, type, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'desc' },
    });
  }

  // "Topluluk kurallarina aykiri [mesaj/yorum] yolladiginiz tespit edilmis olup X
  // [gun/saat] bu ozelligi kullanma erisiminiz engellenmistir." mesaji - kalan sure
  // 1 gunden azsa saat cinsinden gosterilir.
  buildBanMessage(kind: 'mesaj' | 'yorum', expiresAt: Date): string {
    const remainingMs = expiresAt.getTime() - Date.now();
    const remainingHours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));
    const remainingText =
      remainingHours >= 24 ? `${Math.ceil(remainingHours / 24)} gün` : `${remainingHours} saat`;
    return `Topluluk kurallarına aykırı ${kind} yolladığınız tespit edilmiş olup ${remainingText} bu özelliği kullanma erişiminiz engellenmiştir. Bir hata olduğunu düşünüyorsanız destek sayfasından bizimle iletişime geçin.`;
  }

  async getHistoryForUser(userId: string) {
    return this.prisma.userSuspension.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { issuedBy: { select: { id: true, fullName: true, username: true } } },
    });
  }

  async listAll(page = 1, limit = 20, type?: 'COMMENT' | 'DM') {
    const skip = (page - 1) * limit;
    const where = type ? { type } : undefined;
    const [data, total] = await Promise.all([
      this.prisma.userSuspension.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, fullName: true, username: true } },
          issuedBy: { select: { id: true, fullName: true, username: true } },
        },
      }),
      this.prisma.userSuspension.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }
}
