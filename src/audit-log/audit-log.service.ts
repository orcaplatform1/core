import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(actorId: string, action: string, targetType: string, targetId?: string, metadata?: any) {
    return this.prisma.auditLog.create({
      data: { actorId, action, targetType, targetId, metadata },
    });
  }

  async findAll(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByActor(actorId: string) {
    return this.prisma.auditLog.findMany({
      where: { actorId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
