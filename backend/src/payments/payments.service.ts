import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { createHmac, randomUUID } from 'crypto';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadgesService } from '../badges/badges.service';
import { NOT_DELETED_USER_WHERE } from '../common/deleted-user';

const FOUNDING_MEMBER_LIMIT = 500;

const STAFF_DISCOUNT_RATE = 0.15;
const STAFF_COMMISSION_RATE = 0.05;
const STUDENT_DISCOUNT_RATE = 0.15;
const STUDENT_REFERRAL_CREDIT_REWARD = 50;
const STUDENT_REFERRAL_POINTS_REWARD = 25;

const MENTOR_CREDIT_PRICES: Record<number, number> = {
  100: 149,
  250: 299,
  500: 499,
};
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  USDT: 'tether',
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesService: InvoicesService,
    private readonly notificationsService: NotificationsService,
    private readonly badgesService: BadgesService,
  ) {}

  // Ilk 500 program satin alan (mentor kredisi degil, gercek program erisimi
  // acan) ogrenciye "Kurucu Uye" statusu bir kereligine verilir - ekstra rol/
  // yetki YOK, sadece profilde/topluluk gonderilerinde gorunen bir etiket +
  // rozet. Anonimlestirilmis (silinmis-*) kullanicilar sayaca dahil edilmez ki
  // test/demo hesaplarinin acilip silinmesi gercek sayiyi bozmasin.
  private async assignFoundingMemberIfEligible(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isFoundingMember: true } });
    if (!user || user.isFoundingMember) return;

    const foundingCount = await this.prisma.user.count({
      where: { isFoundingMember: true, ...NOT_DELETED_USER_WHERE },
    });
    if (foundingCount >= FOUNDING_MEMBER_LIMIT) return;

    await this.prisma.user.update({ where: { id: userId }, data: { isFoundingMember: true } });
    await this.badgesService.grantByNameIfEligible(userId, 'Kurucu Üye');
  }

  private async createBinancePayOrder(paymentId: string, amount: number, currency: string) {
    const apiKey = process.env.BINANCE_PAY_API_KEY;
    const secretKey = process.env.BINANCE_PAY_SECRET_KEY;

    if (!apiKey || !secretKey) return null;

    const timestamp = Date.now();
    const nonce = randomUUID().replace(/-/g, '');

    const body = {
      env: { terminalType: 'WEB' },
      merchantTradeNo: paymentId,
      orderAmount: amount,
      currency,
      goods: {
        goodsType: '02',
        goodsCategory: 'Z000',
        referenceGoodsId: 'orca-program-access',
        goodsName: 'ORCA Eğitim Programı Erişimi',
      },
    };

    const payload = `${timestamp}\n${nonce}\n${JSON.stringify(body)}\n`;
    const signature = createHmac('sha512', secretKey).update(payload).digest('hex').toUpperCase();

    try {
      const response = await fetch('https://bpay.binanceapi.com/binancepay/openapi/v3/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'BinancePay-Timestamp': String(timestamp),
          'BinancePay-Nonce': nonce,
          'BinancePay-Certificate-SN': apiKey,
          'BinancePay-Signature': signature,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data?.data?.checkoutUrl ?? null;
    } catch {
      return null;
    }
  }

  private async createBybitPayOrder(paymentId: string, amount: number, currency: string) {
    const apiKey = process.env.BYBIT_PAY_API_KEY;
    const secretKey = process.env.BYBIT_PAY_SECRET_KEY;

    if (!apiKey || !secretKey) return null;

    const timestamp = Date.now();

    const body = {
      merchantOrderId: paymentId,
      amount: String(amount),
      currency,
      goodsName: 'ORCA Eğitim Programı Erişimi',
    };

    const payload = `${timestamp}${apiKey}${JSON.stringify(body)}`;
    const signature = createHmac('sha256', secretKey).update(payload).digest('hex');

    try {
      const response = await fetch('https://api.bybit.com/v5/pay/order/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-TIMESTAMP': String(timestamp),
          'X-BAPI-SIGN': signature,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data?.result?.checkoutUrl ?? null;
    } catch {
      return null;
    }
  }

  private getOkxWalletInfo() {
    const walletAddress = process.env.OKX_WALLET_ADDRESS;
    const network = process.env.OKX_WALLET_NETWORK;

    if (!walletAddress) return null;

    return {
      walletAddress,
      network: network ?? 'TRC20',
      note: 'Bu adrese gönderim yaptıktan sonra işlem kanıtını (receiptUrl) yükleyin, admin onayı bekleyin.',
    };
  }

  async getProgramPrice(): Promise<number> {
    const settings = await this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });
    return settings.programPriceTRY;
  }

  async updateProgramPrice(newPriceTRY: number) {
    if (!newPriceTRY || newPriceTRY <= 0) {
      throw new BadRequestException('Geçerli bir fiyat girilmelidir.');
    }
    return this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      update: { programPriceTRY: newPriceTRY },
      create: { id: 'singleton', programPriceTRY: newPriceTRY },
    });
  }

  private async fetchCryptoRateTRY(asset: string): Promise<number> {
    const coinId = COINGECKO_IDS[asset];
    if (!coinId) {
      throw new BadRequestException('Desteklenmeyen kripto varlık. Sadece BTC, ETH, BNB, USDT kabul edilir.');
    }
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=try`,
      );
      if (!res.ok) throw new Error('rate fetch failed');
      const data = await res.json();
      const rate = data?.[coinId]?.try;
      if (!rate) throw new Error('rate missing');
      return rate;
    } catch {
      throw new BadRequestException('Kripto kuru şu anda alınamadı, lütfen tekrar dene.');
    }
  }

  async getSponsorshipPricingUsd() {
    const settings = await this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });
    return {
      7: settings.sponsorshipPrice7dUSD,
      15: settings.sponsorshipPrice15dUSD,
      30: settings.sponsorshipPrice30dUSD,
    };
  }

  async create(userId: string, dto: CreatePaymentDto) {
    const purpose = dto.purpose ?? 'PROGRAM';

    let finalAmount: number;
    let creditAmount: number | undefined;

    let sponsorship: { id: string; userId: string; status: string; paymentId: string | null; priceUsd: number } | null = null;

    if (purpose === 'MENTOR_CREDITS') {
      if (!dto.creditAmount || !MENTOR_CREDIT_PRICES[dto.creditAmount]) {
        throw new BadRequestException('Geçersiz kredi paketi. Seçenekler: 100, 250, 500.');
      }
      finalAmount = MENTOR_CREDIT_PRICES[dto.creditAmount];
      creditAmount = dto.creditAmount;
    } else if (purpose === 'SPONSORSHIP') {
      if (dto.method !== 'CRYPTO') {
        throw new BadRequestException('Sponsorluk ödemesi yalnızca kripto ile yapılabilir.');
      }
      if (!dto.sponsorshipId) {
        throw new BadRequestException('Sponsorluk başvurusu belirtilmedi.');
      }
      sponsorship = await this.prisma.sponsorship.findUnique({ where: { id: dto.sponsorshipId } });
      if (!sponsorship || sponsorship.userId !== userId) {
        throw new BadRequestException('Sponsorluk başvurusu bulunamadı.');
      }
      if (sponsorship.status !== 'AWAITING_PAYMENT' || sponsorship.paymentId) {
        throw new BadRequestException('Bu başvuru için ödeme zaten oluşturulmuş.');
      }
      // Fiyat basvuru olusturulurken USD olarak kaydedilmisti (bkz. SponsorshipsService.create) -
      // odeme aninda gunun USDT/TRY kuruyla TRY'ye cevrilir (USDT ~ 1 USD kabul edilir).
      const usdTryRate = await this.fetchCryptoRateTRY('USDT');
      finalAmount = Math.round(sponsorship.priceUsd * usdTryRate * 100) / 100;
    } else {
      // Program fiyatı ASLA client'tan alınmaz — DB'deki tek doğru kaynaktan okunur (admin panelden düzenlenebilir).
      finalAmount = await this.getProgramPrice();
    }

    let discountApplied: number | null = null;
    let referredByStaffId: string | null = null;
    let referralType: 'STAFF' | 'STUDENT' | null = null;
    let referredByUserId: string | null = null;

    if (dto.promoCode && purpose === 'PROGRAM') {
      const staff = await this.prisma.user.findUnique({
        where: { promoCode: dto.promoCode },
      });

      if (staff && staff.role === 'STAFF') {
        discountApplied = Math.round(finalAmount * STAFF_DISCOUNT_RATE * 100) / 100;
        finalAmount = finalAmount - discountApplied;
        referredByStaffId = staff.id;
        referralType = 'STAFF';
      }
    }

    // Öğrenci referans indirimi staff promo koduyla asla çakışmaz — staff indirimi
    // zaten uygulandıysa (referralType === 'STAFF') bu dal atlanır.
    if (!referralType && purpose === 'PROGRAM') {
      const buyer = await this.prisma.user.findUnique({ where: { id: userId } });

      if (buyer?.referredByUserId) {
        discountApplied = Math.round(finalAmount * STUDENT_DISCOUNT_RATE * 100) / 100;
        finalAmount = finalAmount - discountApplied;
        referredByUserId = buyer.referredByUserId;
        referralType = 'STUDENT';
      }
    }

    let cryptoAsset: string | undefined;
    let cryptoAmountLocked: number | undefined;
    let cryptoRateTRY: number | undefined;
    let cryptoRateLockedAt: Date | undefined;

    if (dto.method === 'CRYPTO') {
      if (!dto.cryptoAsset) {
        throw new BadRequestException('Kripto ile ödemede varlık seçimi zorunlu (BTC, ETH, BNB veya USDT).');
      }
      cryptoAsset = dto.cryptoAsset;
      cryptoRateTRY = await this.fetchCryptoRateTRY(dto.cryptoAsset);
      cryptoAmountLocked = Math.round((finalAmount / cryptoRateTRY) * 1e8) / 1e8;
      cryptoRateLockedAt = new Date();
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: finalAmount,
        currency: dto.currency,
        method: dto.method as any,
        cryptoProvider: dto.cryptoProvider as any,
        cryptoAsset: cryptoAsset as any,
        cryptoAmountLocked,
        cryptoRateTRY,
        cryptoRateLockedAt,
        receiptUrl: dto.receiptUrl,
        status: 'PENDING',
        promoCodeUsed: dto.promoCode,
        discountApplied,
        referredByStaffId,
        referralType: referralType as any,
        referredByUserId,
        purpose: purpose as any,
        creditAmount,
      },
    });

    if (sponsorship) {
      await this.prisma.sponsorship.update({ where: { id: sponsorship.id }, data: { paymentId: payment.id } });
    }

    if (dto.method === 'CRYPTO' && dto.cryptoProvider === 'BINANCE') {
      const checkoutUrl = await this.createBinancePayOrder(payment.id, finalAmount, dto.currency);
      if (checkoutUrl) return { ...payment, checkoutUrl };
    }

    if (dto.method === 'CRYPTO' && dto.cryptoProvider === 'BYBIT') {
      const checkoutUrl = await this.createBybitPayOrder(payment.id, finalAmount, dto.currency);
      if (checkoutUrl) return { ...payment, checkoutUrl };
    }

    if (dto.method === 'CRYPTO' && dto.cryptoProvider === 'OKX') {
      const walletInfo = this.getOkxWalletInfo();
      if (walletInfo) return { ...payment, walletInfo };
    }

    return payment;
  }

  async findMine(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, username: true, email: true } },
        },
      }),
      this.prisma.payment.count({ where }),
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

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Ödeme bulunamadı.');
    return payment;
  }

  async approve(id: string, actorId?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new BadRequestException('Ödeme bulunamadı.');
    if (payment.status === 'APPROVED') throw new BadRequestException('Bu ödeme zaten onaylanmış.');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });

    if (payment.purpose === 'MENTOR_CREDITS' && payment.creditAmount) {
      await this.prisma.user.update({
        where: { id: payment.userId },
        data: { mentorCredits: { increment: payment.creditAmount } },
      });

      await this.invoicesService.createForPayment(payment.id);
      return updated;
    }

    if (payment.purpose === 'SPONSORSHIP') {
      const sponsorship = await this.prisma.sponsorship.findUnique({ where: { paymentId: payment.id } });
      if (sponsorship && sponsorship.status === 'AWAITING_PAYMENT') {
        await this.prisma.sponsorship.update({
          where: { id: sponsorship.id },
          data: { status: 'PENDING_REVIEW' },
        });

        const admins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
        await this.notificationsService.createForManyUsers(
          admins.map((a) => a.id),
          {
            type: 'SYSTEM' as any,
            title: 'Yeni sponsor başvurusu',
            message: `Ödemesi tamamlanan bir sponsor başvurusu (${sponsorship.type === 'ICO' ? 'ICO/IDO' : 'Airdrop'}) onayını bekliyor.`,
            link: '/manage/sponsorships',
          },
        );
      }

      await this.invoicesService.createForPayment(payment.id);
      return updated;
    }

    const programs = await this.prisma.program.findMany();

    for (const program of programs) {
      const existing = await this.prisma.enrollment.findUnique({
        where: { userId_programId: { userId: payment.userId, programId: program.id } },
      });

      if (!existing) {
        await this.prisma.enrollment.create({
          data: { userId: payment.userId, programId: program.id },
        });
      }
    }

    await this.assignFoundingMemberIfEligible(payment.userId);

    if (payment.referredByStaffId) {
      const commissionAmount = Math.round(payment.amount * STAFF_COMMISSION_RATE * 100) / 100;

      await this.prisma.commission.create({
        data: {
          staffId: payment.referredByStaffId,
          paymentId: payment.id,
          amount: commissionAmount,
          rate: STAFF_COMMISSION_RATE,
        },
      });

      const lead = await this.prisma.lead.findFirst({
        where: { staffPromoCode: payment.promoCodeUsed ?? '', convertedUserId: null },
      });

      if (lead) {
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: { convertedUserId: payment.userId },
        });
      }
    }

    if (payment.referralType === 'STUDENT' && payment.referredByUserId) {
      await this.prisma.user.update({
        where: { id: payment.referredByUserId },
        data: {
          mentorCredits: { increment: STUDENT_REFERRAL_CREDIT_REWARD },
          referralCreditsEarned: { increment: STUDENT_REFERRAL_CREDIT_REWARD },
          totalPoints: { increment: STUDENT_REFERRAL_POINTS_REWARD },
          periodPoints: { increment: STUDENT_REFERRAL_POINTS_REWARD },
        },
      });

      await this.notificationsService.create({
        userId: payment.referredByUserId,
        type: 'REFERRAL_REWARD' as any,
        title: 'Referans ödülün hesaba geçti!',
        message: `Davet ettiğin kişi ödemesini tamamladı, hesabına ${STUDENT_REFERRAL_CREDIT_REWARD} Mentor Kredisi eklendi.`,
        link: '/profile',
      });
    }

    await this.invoicesService.createForPayment(payment.id);
    return updated;
  }

  async reject(id: string, actorId?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new BadRequestException('Ödeme bulunamadı.');
    return this.prisma.payment.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  private verifyBinanceSignature(headers: Record<string, string>, rawBody: string): boolean {
    const secretKey = process.env.BINANCE_PAY_SECRET_KEY;
    if (!secretKey) return false;

    const timestamp = headers['binancepay-timestamp'];
    const nonce = headers['binancepay-nonce'];
    const receivedSignature = headers['binancepay-signature'];

    if (!timestamp || !nonce || !receivedSignature) return false;

    const payload = `${timestamp}\n${nonce}\n${rawBody}\n`;
    const expectedSignature = createHmac('sha512', secretKey).update(payload).digest('hex').toUpperCase();

    return expectedSignature === receivedSignature;
  }

  private verifyBybitSignature(headers: Record<string, string>, rawBody: string): boolean {
    const secretKey = process.env.BYBIT_PAY_SECRET_KEY;
    const apiKey = process.env.BYBIT_PAY_API_KEY;
    if (!secretKey || !apiKey) return false;

    const timestamp = headers['x-bapi-timestamp'];
    const receivedSignature = headers['x-bapi-sign'];

    if (!timestamp || !receivedSignature) return false;

    const payload = `${timestamp}${apiKey}${rawBody}`;
    const expectedSignature = createHmac('sha256', secretKey).update(payload).digest('hex');

    return expectedSignature === receivedSignature;
  }

  async handleBinanceWebhook(headers: Record<string, string>, rawBody: string, payload: any) {
    if (!this.verifyBinanceSignature(headers, rawBody)) {
      throw new UnauthorizedException('Geçersiz webhook imzası.');
    }

    const merchantTradeNo = payload?.data?.merchantTradeNo;
    const status = payload?.data?.status;

    if (!merchantTradeNo || status !== 'PAY_SUCCESS') return { returnCode: 'FAIL' };

    const payment = await this.prisma.payment.findUnique({ where: { id: merchantTradeNo } });
    if (payment && payment.status === 'PENDING') await this.approve(merchantTradeNo);

    return { returnCode: 'SUCCESS' };
  }

  async handleBybitWebhook(headers: Record<string, string>, rawBody: string, payload: any) {
    if (!this.verifyBybitSignature(headers, rawBody)) {
      throw new UnauthorizedException('Geçersiz webhook imzası.');
    }

    const merchantOrderId = payload?.merchantOrderId;
    const status = payload?.status;

    if (!merchantOrderId || status !== 'SUCCESS') return { returnCode: 'FAIL' };

    const payment = await this.prisma.payment.findUnique({ where: { id: merchantOrderId } });
    if (payment && payment.status === 'PENDING') await this.approve(merchantOrderId);

    return { returnCode: 'SUCCESS' };
  }
}
