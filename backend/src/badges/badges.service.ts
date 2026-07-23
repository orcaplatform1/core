import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';

@Injectable()
export class BadgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateBadgeDto, actorId: string) {
    const created = await this.prisma.badge.create({
      data: {
        name: dto.name,
        description: dto.description,
        iconUrl: dto.iconUrl,
        triggerType: (dto.triggerType as any) ?? 'CUSTOM',
        requiredCount: dto.requiredCount ?? 1,
      },
    });
    await this.auditLogService.log(actorId, 'BADGE_CREATE', 'Badge', created.id);
    return created;
  }

  async update(id: string, dto: UpdateBadgeDto, actorId: string) {
    const exists = await this.prisma.badge.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Rozet bulunamadı.');
    }
    const updated = await this.prisma.badge.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        iconUrl: dto.iconUrl,
        triggerType: dto.triggerType as any,
        requiredCount: dto.requiredCount,
      },
    });
    await this.auditLogService.log(actorId, 'BADGE_UPDATE', 'Badge', id);
    return updated;
  }

  async findAll() {
    return this.prisma.badge.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async grant(userId: string, badgeId: string, actorId: string) {
    const existing = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
    });
    if (existing) {
      throw new BadRequestException('Bu rozet zaten verilmiş.');
    }
    const granted = await this.prisma.userBadge.create({
      data: { userId, badgeId },
    });
    await this.auditLogService.log(actorId, 'BADGE_GRANT', 'UserBadge', granted.id, { userId, badgeId });
    return granted;
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

  async grantByNameIfEligible(userId: string, badgeName: string) {
    const badge = await this.prisma.badge.findUnique({ where: { name: badgeName } });
    if (!badge) return;
    const already = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });
    if (already) return;
    await this.prisma.userBadge.create({
      data: { userId, badgeId: badge.id },
    });
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
      iconUrl: badge.iconUrl,
      locked: !earnedMap.has(badge.id),
      earnedAt: earnedMap.get(badge.id) ?? null,
    }));
  }

  async remove(id: string, actorId: string) {
    const exists = await this.prisma.badge.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Rozet bulunamadı.');
    }
    await this.prisma.badge.delete({ where: { id } });
    await this.auditLogService.log(actorId, 'BADGE_DELETE', 'Badge', id);
    return { message: 'Silindi.' };
  }
}
