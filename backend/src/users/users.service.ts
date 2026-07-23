import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
          gender: true,
          email: true,
          role: true,
          toolsSubscription: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        gender: true,
        dateOfBirth: true,
        education: true,
        occupation: true,
        email: true,
        phone: true,
        role: true,
        toolsSubscription: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.dateOfBirth) {
      const year = new Date(dto.dateOfBirth).getFullYear();

      if (year > 2010 || year < 1966) {
        throw new BadRequestException(
          'Doğum tarihi 1966 ile 2010 yılları arasında olmalıdır (yaş 16-60 aralığı).',
        );
      }
    }

    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    const data: any = {
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      education: dto.education as any,
      occupation: dto.occupation as any,
    };
    if (dto.email && dto.email !== current?.email) {
      data.email = dto.email;
      data.emailVerified = false;
    }
    if (dto.phone && dto.phone !== current?.phone) {
      data.phone = dto.phone;
      data.phoneVerified = false;
    }
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
          dateOfBirth: true,
          education: true,
          occupation: true,
          email: true,
          phone: true,
          emailVerified: true,
          phoneVerified: true,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new BadRequestException('Bu email veya telefon numarası zaten kullanımda.');
      }
      throw err;
    }
  }

  async findBanned() {
    return this.prisma.user.findMany({
      where: { bannedUntil: { gt: new Date() } },
      select: {
        id: true,
        fullName: true,
        email: true,
        bannedUntil: true,
        banCount: true,
      },
    });
  }

  async unban(id: string, actorId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { bannedUntil: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        bannedUntil: true,
        banCount: true,
      },
    });

    if (actorId) {
      await this.auditLogService.log(actorId, 'USER_UNBAN', 'User', id);
    }

    return updated;
  }

  async updateRole(id: string, role: string, actorId: string) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: { id: true, fullName: true, username: true, role: true },
    });
    await this.auditLogService.log(actorId, 'USER_ROLE_UPDATE', 'User', id, { role });
    return updated;
  }
  async grantEnrollment(id: string, programId: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    const program = await this.prisma.program.findUnique({ where: { id: programId } });
    if (!program) {
      throw new NotFoundException('Program bulunamadı.');
    }
    const enrollment = await this.prisma.enrollment.upsert({
      where: { userId_programId: { userId: id, programId } },
      update: {},
      create: { userId: id, programId },
    });
    if (user.role === 'GUEST') {
      await this.prisma.user.update({ where: { id }, data: { role: 'STUDENT' } });
    }
    await this.auditLogService.log(actorId, 'USER_ENROLLMENT_GRANT', 'User', id, { programId });
    return enrollment;
  }
  async adminUpdateIdentity(id: string, fullName?: string, username?: string, actorId?: string) {
    const exists = await this.prisma.user.findUnique({ where: { id } });

    if (!exists) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { fullName, username },
      select: { id: true, fullName: true, username: true },
    });

    if (actorId) {
      await this.auditLogService.log(actorId, 'USER_IDENTITY_UPDATE', 'User', id, { fullName, username });
    }

    return updated;
  }

  async exportMyData(userId: string) {
    const [
      user,
      enrollments,
      payments,
      certificates,
      quizAttempts,
      progress,
      badges,
      backtestTrades,
      loginLogs,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, phone: true, fullName: true, username: true,
          gender: true, dateOfBirth: true, education: true, occupation: true,
          createdAt: true,
        },
      }),
      this.prisma.enrollment.findMany({ where: { userId } }),
      this.prisma.payment.findMany({ where: { userId } }),
      this.prisma.certificate.findMany({ where: { userId } }),
      this.prisma.quizAttempt.findMany({ where: { userId } }),
      this.prisma.progress.findMany({ where: { userId } }),
      this.prisma.userBadge.findMany({ where: { userId }, include: { badge: true } }),
      this.prisma.backtestTrade.findMany({ where: { userId } }),
      this.prisma.loginLog.findMany({ where: { userId } }),
    ]);

    return {
      exportedAt: new Date(),
      profile: user,
      enrollments,
      payments,
      certificates,
      quizAttempts,
      progress,
      badges,
      backtestTrades,
      loginLogs,
    };
  }

  async requestAccountDeletion(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const anonymizedId = randomUUID().slice(0, 8);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: 'Silinmiş Kullanıcı',
        username: `silinmis-${anonymizedId}`,
        email: null,
        phone: null,
        password: null,
        avatarUrl: null,
        dateOfBirth: null,
        education: null,
        occupation: null,
        sessionId: null,
        refreshTokenHash: null,
        googleId: null,
        appleId: null,
      },
    });

    await this.auditLogService.log(userId, 'ACCOUNT_SELF_DELETE', 'User', userId);

    return {
      message: 'Hesabınız anonimleştirildi. Yasal saklama süresi gereken ödeme/sertifika kayıtları (10 yıl) korunur, ancak kişisel bilgileriniz silindi.',
    };
  }
}
