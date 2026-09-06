import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESS_COOKIE } from '../auth-cookies.util';

// Token artik httpOnly cookie'de tasiniyor (bkz. auth-cookies.util.ts); Bearer
// header extractor'i geriye donuk uyumluluk icin (ornegin ileride mobil istemci)
// yedek olarak birakildi.
function cookieExtractor(req: Request): string | null {
  return req?.cookies?.[ACCESS_COOKIE] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.sessionId !== payload.sessionId) {
      throw new UnauthorizedException('Bu oturum artık geçerli değil, başka bir yerden giriş yapılmış olabilir.');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      gender: user.gender,
      avatarUrl: user.avatarUrl,
      dateOfBirth: user.dateOfBirth,
      education: user.education,
      occupation: user.occupation,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      sessionId: user.sessionId,
      toolsSubscription: user.toolsSubscription,
    };
  }
}
