import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  private static readonly MAX_KEPT_NOTIFICATIONS = 15;

  // Duyuru olmayan bildirimlerde kullanıcı başına son 15'i tutar, gerisini kalıcı
  // olarak siler (duyurular bu kapsam dışı — bkz. findMyAnnouncements, ayrı ve
  // sınırsız arşivlenir).
  private async trimOldNotifications(userId: string) {
    const old = await this.prisma.notification.findMany({
      where: { userId, type: { not: 'ANNOUNCEMENT' } },
      orderBy: { createdAt: 'desc' },
      skip: NotificationsService.MAX_KEPT_NOTIFICATIONS,
      select: { id: true },
    });
    if (old.length > 0) {
      await this.prisma.notification.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
    }
  }

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type as any,
        title: dto.title,
        message: dto.message,
        link: dto.link,
      },
    });
    this.gateway.emitToUser(dto.userId, 'notification', notification);
    if (dto.type !== 'ANNOUNCEMENT') {
      await this.trimOldNotifications(dto.userId);
    }
    return notification;
  }

  // Var olan bir bildirimin metnini gunceller ve tekrar "okunmadi" yapar -
  // begeni gruplama gibi "ayni bildirimi spam etmeden guncelle" senaryolari
  // icin (bkz. community.service.ts react()).
  async updateMessage(id: string, message: string) {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { message, read: false, createdAt: new Date() },
    });
    this.gateway.emitToUser(updated.userId, 'notification', updated);
    return updated;
  }

  async createForManyUsers(
    userIds: string[],
    dto: Omit<CreateNotificationDto, 'userId'> & { broadcastId?: string },
  ) {
    const result = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: dto.type as any,
        title: dto.title,
        message: dto.message,
        link: dto.link,
        broadcastId: dto.broadcastId,
      })),
    });
    const event = dto.type === 'ANNOUNCEMENT' ? 'announcement' : 'notification';
    for (const userId of userIds) {
      this.gateway.emitToUser(userId, event, { title: dto.title, message: dto.message, link: dto.link });
    }
    if (dto.type !== 'ANNOUNCEMENT') {
      await Promise.all(userIds.map((userId) => this.trimOldNotifications(userId)));
    }
    return result;
  }

  async findMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, type: { not: 'ANNOUNCEMENT' } },
      orderBy: { createdAt: 'desc' },
      take: NotificationsService.MAX_KEPT_NOTIFICATIONS,
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false, type: { not: 'ANNOUNCEMENT' } },
    });

    return { count };
  }

  async findMyAnnouncements(userId: string, page = 1, limit = 10) {
    const where = { userId, type: 'ANNOUNCEMENT' as const };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async unreadAnnouncementCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false, type: 'ANNOUNCEMENT' },
    });

    return { count };
  }

  async markAsRead(userId: string, id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });

    if (!notif) {
      throw new NotFoundException('Bildirim bulunamadı.');
    }

    if (notif.userId !== userId) {
      throw new ForbiddenException('Bu bildirim size ait değil.');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false, type: { not: 'ANNOUNCEMENT' } },
      data: { read: true },
    });

    return { message: 'Tümü okundu olarak işaretlendi.' };
  }

  async markAllAnnouncementsAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false, type: 'ANNOUNCEMENT' },
      data: { read: true },
    });

    return { message: 'Tüm duyurular okundu olarak işaretlendi.' };
  }
}
