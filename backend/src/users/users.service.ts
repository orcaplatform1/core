import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { randomUUID } from 'crypto';
import { AdminUpdateProfileDto } from './dto/admin-update-profile.dto';
import { AdjustMentorCreditsDto } from './dto/adjust-mentor-credits.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { PresenceService } from '../notifications/presence.service';
import { StatsService } from '../stats/stats.service';
import { NOT_DELETED_USER_WHERE } from '../common/deleted-user';

// Staff/Super Admin avatarı cinsiyetten bağımsız her zaman ORCA amblemi olmalı
// (bkz. manage.service.ts makeStaff() ile aynı görsel).
const ORCA_STAFF_AVATAR = 'https://traders.tr/avatars/admin-staff.png';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly presence: PresenceService,
    private readonly stats: StatsService,
  ) {}

  async findAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = {
      ...NOT_DELETED_USER_WHERE,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' as const } },
              { username: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
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
      this.prisma.user.count({ where }),
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
    // Staff/Super Admin'in avatarı cinsiyetten bağımsız her zaman ORCA amblemi olmalı;
    // aksi halde register() sırasında atanan cinsiyete göre avatar (mavi/pembe) kalıyor.
    const isStaffOrAdmin = role === 'STAFF' || role === 'SUPER_ADMIN';
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        role: role as any,
        ...(isStaffOrAdmin ? { avatarUrl: ORCA_STAFF_AVATAR } : {}),
      },
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

  async getReferralStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        referralCreditsEarned: true,
        _count: { select: { referrals: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    return {
      code: user.username,
      invitedCount: user._count.referrals,
      creditsEarned: user.referralCreditsEarned,
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

  async adminUpdateProfile(id: string, dto: AdminUpdateProfileDto, actorId: string) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    const data: any = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.education !== undefined) data.education = dto.education;
    if (dto.occupation !== undefined) data.occupation = dto.occupation;
    if (dto.gender !== undefined) data.gender = dto.gender;
    data.emailVerified = true;
    data.phoneVerified = true;
    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data,
        select: {
          id: true, fullName: true, username: true, email: true, phone: true,
          dateOfBirth: true, education: true, occupation: true, gender: true,
          emailVerified: true, phoneVerified: true,
        },
      });
      await this.auditLogService.log(actorId, 'USER_ADMIN_PROFILE_UPDATE', 'User', id, dto as any);
      return updated;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new BadRequestException('Bu email veya telefon numarası zaten kullanımda.');
      }
      throw err;
    }
  }

  async adjustMentorCredits(id: string, dto: AdjustMentorCreditsDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    const newBalance = Math.max(0, user.mentorCredits + dto.delta);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { mentorCredits: newBalance },
      select: { id: true, mentorCredits: true },
    });
    await this.auditLogService.log(actorId, 'USER_MENTOR_CREDITS_ADJUST', 'User', id, { delta: dto.delta, newBalance });
    return updated;
  }

  async banUser(id: string, dto: BanUserDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    const bannedUntil = new Date(Date.now() + dto.days * 24 * 60 * 60 * 1000);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { bannedUntil, banCount: { increment: 1 } },
      select: { id: true, bannedUntil: true, banCount: true },
    });
    await this.auditLogService.log(actorId, 'USER_BAN', 'User', id, { days: dto.days });
    return updated;
  }

  async resetBanCount(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { banCount: 0 },
      select: { id: true, banCount: true },
    });
    await this.auditLogService.log(actorId, 'USER_BAN_COUNT_RESET', 'User', id);
    return updated;
  }

  async revokeEnrollment(id: string, programId: string, actorId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_programId: { userId: id, programId } },
    });
    if (!enrollment) {
      throw new NotFoundException('Erişim kaydı bulunamadı.');
    }
    await this.prisma.enrollment.delete({
      where: { userId_programId: { userId: id, programId } },
    });
    await this.auditLogService.log(actorId, 'USER_ENROLLMENT_REVOKE', 'User', id, { programId });
    return { message: 'Erişim iptal edildi.' };
  }

  async adminDeleteUser(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    const anonymizedId = randomUUID().slice(0, 8);
    try {
      await this.prisma.user.update({
        where: { id },
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
          role: 'GUEST',
        },
      });
    } catch (err: any) {
      if (err.code === 'P2003') {
        throw new BadRequestException('Bu kullanıcının sertifikası var, tam silinemez. Hesap anonimleştirilmeye çalışıldı ancak sertifika kaydı engellendi.');
      }
      throw err;
    }
    await this.auditLogService.log(actorId, 'USER_ADMIN_DELETE', 'User', id);
    return { message: 'Kullanıcı anonimleştirildi (sertifika/ödeme kayıtları yasal saklama nedeniyle korunur).' };
  }

  async findFullDetail(id: string) {
    const [user, payments, quizAttempts, progress, certificates, loginLogs, enrollments] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true, fullName: true, username: true, avatarUrl: true, gender: true,
          dateOfBirth: true, education: true, occupation: true, email: true, phone: true,
          emailVerified: true, phoneVerified: true, role: true, toolsSubscription: true,
          mentorCredits: true, bannedUntil: true, banCount: true, createdAt: true, lastLoginAt: true,
        },
      }),
      this.prisma.payment.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }),
      this.prisma.quizAttempt.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }),
      this.prisma.progress.findMany({ where: { userId: id } }),
      this.prisma.certificate.findMany({ where: { userId: id } }),
      this.prisma.loginLog.findMany({ where: { userId: id }, orderBy: { loggedInAt: 'desc' }, take: 20 }),
      this.prisma.enrollment.findMany({ where: { userId: id } }),
    ]);
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    return { user, payments, quizAttempts, progress, certificates, loginLogs, enrollments };
  }

  // Baska bir kullanicinin profilini goruntulerken kullanilir - findById/findFullDetail'in
  // aksine PII (email/phone) SADECE STAFF/SUPER_ADMIN goruntuluyorsa donuluyor.
  async getPublicProfile(id: string, viewerId: string, viewerRole: string) {
    // Profil sahibi goruntuleyeni engellemisse hicbir bilgi donulmez - engellenen
    // kisi karsi tarafin profiline (istatistik, rozet, hicbir sey) erisemez.
    if (id !== viewerId) {
      const blockedByOwner = await this.prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId: id, blockedId: viewerId } },
      });
      if (blockedByOwner) {
        throw new ForbiddenException('Bu kullanıcı sizi engellediği için profiline erişemezsiniz.');
      }
    }

    // Profil karti kimsenin email/telefonunu gostermez (STAFF/SUPER_ADMIN
    // goruntuluyor olsa bile) - bu bilgiler sadece /manage/users/:id gibi
    // dahili yonetim araclarinda, ayri bir yetki kontroluyle gosterilir.
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, fullName: true, username: true, avatarUrl: true, gender: true, role: true, occupation: true,
        currentStreak: true, longestStreak: true, createdAt: true,
        userBadges: { select: { earnedAt: true, badge: { select: { name: true, iconUrl: true } } } },
      },
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const [isBlockedByMe, hasBlockedMe] = await Promise.all([
      this.prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: viewerId, blockedId: id } } }),
      this.prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: id, blockedId: viewerId } } }),
    ]);

    // Basari oranlari (quiz/backtest/simulasyon/egitim tamamlama) sadece
    // ogrenci/guest profillerinde gosterilir - staff/superadmin icin anlamsiz
    // ve gizli tutulmasi istendi.
    const isStaffOrAdmin = user.role === 'STAFF' || user.role === 'SUPER_ADMIN';
    const performance = !isStaffOrAdmin ? await this.stats.getMyStats(id) : null;

    // Rozet vitrininin hemen ustunde gosterilen kucuk topluluk ozeti
    // ("X Paylasim · Y Toplam Begeni") - sadece bilgi amacli.
    const communityStats = !isStaffOrAdmin
      ? await (async () => {
          const [postsCount, likesReceived] = await Promise.all([
            this.prisma.communityPost.count({ where: { userId: id, hiddenAt: null } }),
            this.prisma.postLike.count({ where: { type: 'LIKE', post: { userId: id, hiddenAt: null } } }),
          ]);
          return { postsCount, likesReceived };
        })()
      : null;

    return {
      ...user,
      // Yetkili/kurucu profillerinde seri, rozet gibi ogrenci-odakli istatistikler
      // gosterilmez - sadece temel profil karti (isim/rol/uyelik tarihi) goruntulenir.
      currentStreak: isStaffOrAdmin ? null : user.currentStreak,
      longestStreak: isStaffOrAdmin ? null : user.longestStreak,
      userBadges: isStaffOrAdmin ? [] : user.userBadges,
      communityStats,
      online: this.presence.isOnline(user.id),
      isBlockedByMe: !!isBlockedByMe,
      hasBlockedMe: !!hasBlockedMe,
      performance,
    };
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new BadRequestException('Kendinizi engelleyemezsiniz.');
    const target = await this.prisma.user.findUnique({ where: { id: blockedId } });
    if (!target) throw new NotFoundException('Kullanıcı bulunamadı.');
    if (target.role === 'STAFF' || target.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Yetkili/Kurucu hesapları engelleyemezsiniz.');
    }
    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });
    return { success: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
    return { success: true };
  }

  async getMyBlockedList(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.block.findMany({
        where: { blockerId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, createdAt: true,
          blocked: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        },
      }),
      this.prisma.block.count({ where: { blockerId: userId } }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }
}
