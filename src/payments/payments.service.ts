import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

const STAFF_DISCOUNT_RATE = 0.15;
const STAFF_COMMISSION_RATE = 0.05;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.payment.create({
      data: {
        userId,
        amount: finalAmount,
        currency: dto.currency,
        method: dto.method as any,
        receiptUrl: dto.receiptUrl,
        status: 'PENDING',
        promoCodeUsed: dto.promoCode,
        discountApplied,
        referredByStaffId,
      },
    });
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

    if (!payment) {
      throw new NotFoundException('Ödeme bulunamadı.');
    }

    return payment;
  }

  async approve(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });

    if (!payment) {
      throw new BadRequestException('Ödeme bulunamadı.');
    }

    if (payment.status === 'APPROVED') {
      throw new BadRequestException('Bu ödeme zaten onaylanmış.');
    }

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

    if (!payment) {
      throw new BadRequestException('Ödeme bulunamadı.');
    }

    return this.prisma.payment.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }
}
