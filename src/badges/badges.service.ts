import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBadgeDto } from './dto/create-badge.dto';

@Injectable()
export class BadgesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBadgeDto) {
    return this.prisma.badge.create({
      data: {
        name: dto.name,
        description: dto.description,
        triggerType: (dto.triggerType as any) ?? 'CUSTOM',
        requiredCount: dto.requiredCount ?? 1,
      },
    });
  }

  async findAll() {
    return this.prisma.badge.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async grant(userId: string, badgeId: string) {
    const existing = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
    });

    if (existing) {
      throw new BadRequestException('Bu rozet zaten verilmiş.');
    }

    return this.prisma.userBadge.create({
      data: { userId, badgeId },
    });
  }

  async checkAndGrant(userId: string, triggerType: string, currentCount: number) {
    const eligibleBadges = await this.prisma.badge.findMany({
      where: {
        triggerType: triggerType as any,
        requiredCount: { lte: currentCount },
      },
    });

    for (const badge of eligibleBadges) {
      const already = await this.prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
      });

      if (!already) {
        await this.prisma.userBadge.create({
          data: { userId, badgeId: badge.id },
        });
      }
    }
  }

  async findMine(userId: string) {
    const allBadges = await this.prisma.badge.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const earned = await this.prisma.userBadge.findMany({
      where: { userId },
    });

    const earnedMap = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));

    return allBadges.map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      locked: !earnedMap.has(badge.id),
      earnedAt: earnedMap.get(badge.id) ?? null,
    }));
  }

  async remove(id: string) {
    const exists = await this.prisma.badge.findUnique({ where: { id } });

    if (!exists) {
      throw new NotFoundException('Rozet bulunamadı.');
    }

    await this.prisma.badge.delete({ where: { id } });

    return { message: 'Silindi.' };
  }
}
