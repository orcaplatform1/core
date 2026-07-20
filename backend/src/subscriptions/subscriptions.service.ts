import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(userId: string, dto: CreateSubscriptionDto) {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + dto.months);

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        status: 'ACTIVE',
        startedAt: now,
        expiresAt,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { toolsSubscription: 'ACTIVE' },
    });

    return subscription;
  }

  async findMine(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });

    if (!sub) {
      throw new NotFoundException('Abonelik bulunamadı.');
    }

    return sub;
  }

  async cancel(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });

    if (!sub) {
      throw new BadRequestException('Abonelik bulunamadı.');
    }

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: { status: 'EXPIRED' },
    });

    await this.prisma.user.update({
      where: { id: sub.userId },
      data: { toolsSubscription: 'EXPIRED' },
    });

    return updated;
  }
}
