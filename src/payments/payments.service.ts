import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { createHmac, randomUUID } from 'crypto';

const STAFF_DISCOUNT_RATE = 0.15;
const STAFF_COMMISSION_RATE = 0.05;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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
      // Not: Gerçek Bybit Pay endpoint/imza formatı, API key alındığında
      // resmi Bybit Pay dokümantasyonuna göre doğrulanıp güncellenmeli.
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

  async create(userId: string, dto: CreatePaymentDto) {
    let finalAmount = dto.amount;
    let discountApplied: number | null = null;
    let referredByStaffId: string | null = null;

    if (dto.promoCode) {
      const staff = await this.prisma.user.findUnique({
        where: { promoCode: dto.promoCode },
      });

      if (staff && staff.role === 'STAFF') {
        discountApplied = Math.round(dto.amount * STAFF_DISCOUNT_RATE * 100) / 100;
        finalAmount = dto.amount - discountApplied;
        referredByStaffId = staff.id;
      }
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: finalAmount,
        currency: dto.currency,
        method: dto.method as any,
        cryptoProvider: dto.cryptoProvider as any,
        receiptUrl: dto.receiptUrl,
        status: 'PENDING',
        promoCodeUsed: dto.promoCode,
        discountApplied,
        referredByStaffId,
      },
    });

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

  async findAll() {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Ödeme bulunamadı.');
    return payment;
  }

  async approve(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new BadRequestException('Ödeme bulunamadı.');
    if (payment.status === 'APPROVED') throw new BadRequestException('Bu ödeme zaten onaylanmış.');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });

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

    return updated;
  }

  async reject(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new BadRequestException('Ödeme bulunamadı.');
    return this.prisma.payment.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  async handleBinanceWebhook(payload: any) {
    const merchantTradeNo = payload?.data?.merchantTradeNo;
    const status = payload?.data?.status;

    if (!merchantTradeNo || status !== 'PAY_SUCCESS') return { returnCode: 'FAIL' };

    const payment = await this.prisma.payment.findUnique({ where: { id: merchantTradeNo } });
    if (payment && payment.status === 'PENDING') await this.approve(merchantTradeNo);

    return { returnCode: 'SUCCESS' };
  }

  async handleBybitWebhook(payload: any) {
    const merchantOrderId = payload?.merchantOrderId;
    const status = payload?.status;

    if (!merchantOrderId || status !== 'SUCCESS') return { returnCode: 'FAIL' };

    const payment = await this.prisma.payment.findUnique({ where: { id: merchantOrderId } });
    if (payment && payment.status === 'PENDING') await this.approve(merchantOrderId);

    return { returnCode: 'SUCCESS' };
  }
}
