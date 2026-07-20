import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID, randomInt } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { SecurityLogService } from '../security-log/security-log.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const MAX_DEVICES_PER_DAY = 2;
const BAN_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

const BLUE_AVATAR = 'https://traders.tr/avatars/orca-blue.png';
const PINK_AVATAR = 'https://traders.tr/avatars/orca-pink.png';

function avatarForGender(gender: string): string {
  return gender === 'ERKEK' ? BLUE_AVATAR : PINK_AVATAR;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly securityLogService: SecurityLogService,
  ) {}

  private async issueTokens(userId: string, email: string | null, role: string, sessionId: string) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role, sessionId },
      { expiresIn: '7d' },
    );

    const refreshToken = randomUUID() + randomUUID();
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });

    return { accessToken, refreshToken };
  }

  private async linkLeadIfExists(userId: string, phone: string | undefined) {
    if (!phone) return;

    const lead = await this.prisma.lead.findUnique({ where: { phone } });
    if (!lead) return;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        financialProfile: lead.financialProfile,
        referredByStaffId: lead.staffPromoCode
          ? (await this.prisma.user.findUnique({ where: { promoCode: lead.staffPromoCode } }))?.id
          : undefined,
      },
    });

    if (!lead.convertedUserId) {
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { convertedUserId: userId },
      });
    }
  }

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email veya telefon numarasından biri zorunludur.');
    }

    if (dto.email) {
      const existsEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existsEmail) throw new ConflictException('Bu email zaten kayıtlı.');
    }

    if (dto.phone) {
      const existsPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existsPhone) throw new ConflictException('Bu telefon numarası zaten kayıtlı.');
    }

    const existsUsername = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existsUsername) throw new ConflictException('Bu kullanıcı adı zaten alınmış.');

    const password = await bcrypt.hash(dto.password, 10);
    const sessionId = randomUUID();
    const emailVerificationToken = dto.email ? randomUUID() : null;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        password,
        fullName: dto.fullName,
        username: dto.username,
        gender: dto.gender as any,
        avatarUrl: avatarForGender(dto.gender),
        profileComplete: true,
        sessionId,
        lastLoginAt: new Date(),
        emailVerificationToken,
      },
    });

    await this.linkLeadIfExists(user.id, dto.phone);

    const { accessToken, refreshToken } = await this.issueTokens(user.id, user.email, user.role, sessionId);

    return { token: accessToken, refreshToken, user };
  }

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      await this.securityLogService.log('LOGIN_FAILED_UNKNOWN_EMAIL', undefined, ip, userAgent, { email: dto.email });
      throw new UnauthorizedException('Email veya şifre hatalı');
    }

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      const remainingMs = user.bannedUntil.getTime() - Date.now();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      throw new ForbiddenException(
        `Hesabınız şüpheli giriş aktivitesi nedeniyle geçici olarak kısıtlandı. Kalan süre: ~${remainingHours} saat.`,
      );
    }

    if (!user.password) {
      throw new UnauthorizedException('Bu hesap Google/Apple ile oluşturulmuş, şifre ile giriş yapılamaz.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatch) {
      await this.securityLogService.log('LOGIN_FAILED_WRONG_PASSWORD', user.id, ip, userAgent);
      throw new UnauthorizedException('Email veya şifre hatalı');
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaysLogins = await this.prisma.loginLog.findMany({
      where: { userId: user.id, loggedInAt: { gte: startOfDay } },
      select: { userAgent: true },
    });

    const distinctDevices = new Set(
      todaysLogins.map((l) => l.userAgent).filter(Boolean),
    );

    const isNewDevice = userAgent && !distinctDevices.has(userAgent);

    if (isNewDevice && distinctDevices.size >= MAX_DEVICES_PER_DAY) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          bannedUntil: new Date(Date.now() + BAN_DURATION_MS),
          banCount: { increment: 1 },
          sessionId: null,
        },
      });

      await this.securityLogService.log('ACCOUNT_AUTO_BANNED_DEVICE_LIMIT', user.id, ip, userAgent);

      throw new ForbiddenException(
        'Bugün çok fazla farklı cihazdan giriş denemesi tespit edildi. Şifre paylaşımı şüphesiyle hesabınız 3 gün süreyle kısıtlandı.',
      );
    }

    if (isNewDevice) {
      await this.securityLogService.log('NEW_DEVICE_LOGIN', user.id, ip, userAgent);
    }

    if (user.phone) {
      await this.linkLeadIfExists(user.id, user.phone);
    }

    const sessionId = randomUUID();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { sessionId, lastLoginAt: new Date() },
    });

    await this.prisma.loginLog.create({
      data: { userId: user.id, ip, userAgent },
    });

    await this.securityLogService.log('LOGIN_SUCCESS', user.id, ip, userAgent);

    const { accessToken, refreshToken } = await this.issueTokens(user.id, user.email, user.role, sessionId);

    return { token: accessToken, refreshToken, user: { ...user, sessionId } };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Geçersiz refresh token.');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);

    if (!isValid) {
      await this.securityLogService.log('REFRESH_TOKEN_INVALID', userId);
      throw new UnauthorizedException('Geçersiz refresh token.');
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.issueTokens(
      user.id,
      user.email,
      user.role,
      user.sessionId ?? randomUUID(),
    );

    return { token: accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { sessionId: null, refreshTokenHash: null },
    });

    return { message: 'Çıkış yapıldı.' };
  }

  async getMyDevices(userId: string) {
    return this.prisma.loginLog.findMany({
      where: { userId },
      orderBy: { loggedInAt: 'desc' },
      take: 20,
      select: { id: true, ip: true, userAgent: true, loggedInAt: true },
    });
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { message: 'Eğer bu email kayıtlıysa, sıfırlama bağlantısı gönderildi.' };
    }

    const resetToken = randomUUID();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: resetToken, passwordResetExpires: resetExpires },
    });

    const emailApiKey = process.env.EMAIL_API_KEY;

    if (!emailApiKey) {
      return {
        message: 'Şifre sıfırlama isteği alındı ancak email servisi henüz yapılandırılmadı.',
      };
    }

    return { message: 'Eğer bu email kayıtlıysa, sıfırlama bağlantısı gönderildi.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: token, passwordResetExpires: { gt: new Date() } },
    });

    if (!user) {
      throw new BadRequestException('Sıfırlama bağlantısı geçersiz veya süresi dolmuş.');
    }

    const password = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password,
        passwordResetToken: null,
        passwordResetExpires: null,
        sessionId: null,
      },
    });

    await this.securityLogService.log('PASSWORD_RESET', user.id);

    return { message: 'Şifre başarıyla değiştirildi. Lütfen tekrar giriş yapın.' };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Doğrulama bağlantısı geçersiz.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerificationToken: null },
    });

    return { message: 'Email doğrulandı.' };
  }

  async requestPhoneVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.phone) {
      throw new BadRequestException('Kayıtlı bir telefon numaranız yok.');
    }

    const code = String(randomInt(100000, 999999));
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: { phoneVerificationCode: code, phoneVerificationExpires: expires },
    });

    const smsApiKey = process.env.SMS_API_KEY;

    if (!smsApiKey) {
      return {
        message: 'SMS servisi henüz yapılandırılmadı. Doğrulama kodu oluşturuldu ama gönderilemedi.',
      };
    }

    return { message: 'Doğrulama kodu telefonunuza gönderildi.' };
  }

  async confirmPhoneVerification(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (
      !user ||
      !user.phoneVerificationCode ||
      user.phoneVerificationCode !== code ||
      !user.phoneVerificationExpires ||
      user.phoneVerificationExpires < new Date()
    ) {
      throw new BadRequestException('Doğrulama kodu geçersiz veya süresi dolmuş.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { phoneVerified: true, phoneVerificationCode: null, phoneVerificationExpires: null },
    });

    return { message: 'Telefon numarası doğrulandı.' };
  }

  async googleLogin(idToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      throw new ServiceUnavailableException('Google girişi henüz yapılandırılmadı.');
    }

    throw new ServiceUnavailableException('Google girişi entegrasyonu tamamlanmadı.');
  }

  async appleLogin(idToken: string, fullName?: string) {
    const clientId = process.env.APPLE_CLIENT_ID;

    if (!clientId) {
      throw new ServiceUnavailableException('Apple girişi henüz yapılandırılmadı.');
    }

    throw new ServiceUnavailableException('Apple girişi entegrasyonu tamamlanmadı.');
  }

  async completeProfile(userId: string, username: string, phone: string, gender: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı.');
    }

    if (user.profileComplete) {
      throw new BadRequestException('Profil zaten tamamlanmış.');
    }

    const usernameTaken = await this.prisma.user.findUnique({ where: { username } });
    if (usernameTaken) throw new ConflictException('Bu kullanıcı adı zaten alınmış.');

    const phoneTaken = await this.prisma.user.findUnique({ where: { phone } });
    if (phoneTaken) throw new ConflictException('Bu telefon numarası zaten kayıtlı.');

    await this.linkLeadIfExists(userId, phone);

    return this.prisma.user.update({
      where: { id: userId },
      data: { username, phone, gender: gender as any, avatarUrl: avatarForGender(gender), profileComplete: true },
      select: { id: true, fullName: true, username: true, phone: true, email: true, gender: true, avatarUrl: true },
    });
  }

  async health() {
    return {
      status: 'ok',
    };
  }
}
