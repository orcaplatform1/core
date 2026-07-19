import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type as any,
        title: dto.title,
        message: dto.message,
        link: dto.link,
      },
    });
  }

  async createForManyUsers(userIds: string[], dto: Omit<CreateNotificationDto, 'userId'>) {
    return this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: dto.type as any,
        title: dto.title,
        message: dto.message,
        link: dto.link,
      })),
    });
  }

  async findMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
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
      where: { userId, read: false },
      data: { read: true },
    });

    return { message: 'Tümü okundu olarak işaretlendi.' };
  }
}
