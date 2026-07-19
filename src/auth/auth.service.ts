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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const MAX_DEVICES_PER_DAY = 2;
const BAN_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
        profileComplete: true,
        sessionId,
        lastLoginAt: new Date(),
        emailVerificationToken,
      },
    });

    const { accessToken, refreshToken } = await this.issueTokens(user.id, user.email, user.role, sessionId);

    // E-posta doğrulama linki gönderme buraya gelecek (EMAIL_API_KEY eklendiğinde):
    // await sendVerificationEmail(user.email, emailVerificationToken);

    return { token: accessToken, refreshToken, user };
  }

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
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

      throw new ForbiddenException(
        'Bugün çok fazla farklı cihazdan giriş denemesi tespit edildi. Şifre paylaşımı şüphesiyle hesabınız 3 gün süreyle kısıtlandı.',
      );
    }

    const sessionId = randomUUID();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { sessionId, lastLoginAt: new Date() },
    });

    await this.prisma.loginLog.create({
      data: { userId: user.id, ip, userAgent },
    });

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

    // Şifre sıfırlama emaili gönderme buraya gelecek

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

  async completeProfile(userId: string, username: string, phone: string) {
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

    return this.prisma.user.update({
      where: { id: userId },
      data: { username, phone, profileComplete: true },
      select: { id: true, fullName: true, username: true, phone: true, email: true },
    });
  }

  async health() {
    return {
      status: 'ok',
    };
  }
}
