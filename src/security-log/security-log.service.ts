import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SecurityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(type: string, userId?: string, ip?: string, userAgent?: string, details?: any) {
    return this.prisma.securityEvent.create({
      data: { type, userId, ip, userAgent, details },
    });
  }

  async findAll(limit = 100) {
    return this.prisma.securityEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByUser(userId: string) {
    return this.prisma.securityEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
