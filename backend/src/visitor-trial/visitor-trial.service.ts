import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Cron } from '@nestjs/schedule';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

const COOKIE_NAME = 'orca_visitor_id';
const TRIAL_DURATION_MS = 2 * 60 * 1000;
// Cerez, DB kaydinin kendisinden cok daha uzun yasar (1 yil) - amac kullanici
// tarayiciyi kapatip actiginda AYNI cookieId'yi geri getirmesi, boylece
// suresi dolmus bir kayda tekrar denk gelip erisimin engellenmesi. Kullanici
// cerezleri temizlerse yeni bir cookieId/kayit olusur - cerez-bazli takibin
// kacinilmaz siniri (IP/parmak izi gibi daha agresif yontemler kullanilmadi).
const COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export interface VisitorTrialStatus {
  firstAccessAt: Date;
  expiresAt: Date;
  remainingSeconds: number;
  expired: boolean;
}

@Injectable()
export class VisitorTrialService {
  private readonly logger = new Logger(VisitorTrialService.name);

  constructor(private readonly prisma: PrismaService) {}

  private parseCookieId(req: Request): string | null {
    const header = req.headers.cookie;
    if (!header) return null;
    const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    return decodeURIComponent(match.slice(COOKIE_NAME.length + 1)) || null;
  }

  private setCookie(res: Response, cookieId: string): void {
    res.cookie(COOKIE_NAME, cookieId, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    });
  }

  async getStatus(req: Request, res: Response): Promise<VisitorTrialStatus> {
    let cookieId = this.parseCookieId(req);
    if (!cookieId) {
      cookieId = randomUUID();
      this.setCookie(res, cookieId);
    }

    let visitor = await this.prisma.anonymousVisitor.findUnique({ where: { cookieId } });
    if (!visitor) {
      const now = new Date();
      try {
        visitor = await this.prisma.anonymousVisitor.create({
          data: { cookieId, firstAccessAt: now, expiresAt: new Date(now.getTime() + TRIAL_DURATION_MS) },
        });
      } catch {
        // Es zamanli iki istek ayni cookieId icin yaris durumuna girerse
        // (ornegin sayfadaki birden fazla bilesen ayni anda ilk cagriyi
        // yaparsa) unique constraint hatasi alinir - digeri zaten olusturdu,
        // onu oku.
        visitor = await this.prisma.anonymousVisitor.findUniqueOrThrow({ where: { cookieId } });
      }
    }

    const remainingMs = visitor.expiresAt.getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    return {
      firstAccessAt: visitor.firstAccessAt,
      expiresAt: visitor.expiresAt,
      remainingSeconds,
      expired: remainingSeconds <= 0,
    };
  }

  // Cerezin kendi omru (1 yil) dolmus kayitlari temizler - bu noktadan sonra
  // tarayicida zaten cerez kalmamis olacagi icin DB kaydinin tutulmasinin
  // hicbir faydasi yok (bkz. cerez maxAge notu).
  @Cron('0 4 * * *')
  async cleanupExpiredRecords() {
    const cutoff = new Date(Date.now() - COOKIE_MAX_AGE_MS);
    const { count } = await this.prisma.anonymousVisitor.deleteMany({ where: { createdAt: { lt: cutoff } } });
    if (count > 0) {
      this.logger.log(`${count} eski ziyaretci kaydi temizlendi (cerez omru dolmus)`);
    }
  }
}
