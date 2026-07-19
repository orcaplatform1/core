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

  async findMine(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });
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
