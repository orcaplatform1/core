import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

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

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (exists) {
      throw new ConflictException('Email already exists');
    }

    const password = await bcrypt.hash(dto.password, 10);
    const sessionId = randomUUID();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password,
        fullName: dto.fullName,
        sessionId,
      },
    });

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });

    return { token, user };
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
      data: { sessionId },
    });

    await this.prisma.loginLog.create({
      data: { userId: user.id, ip, userAgent },
    });

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });

    return { token, user: { ...user, sessionId } };
  }

  async health() {
    return {
      status: 'ok',
    };
  }
}
