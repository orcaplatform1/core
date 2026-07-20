import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async createForPayment(paymentId: string) {
    const existing = await this.prisma.invoice.findUnique({ where: { paymentId } });
    if (existing) return existing;

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Ödeme bulunamadı.');

    return this.prisma.invoice.create({
      data: {
        paymentId: payment.id,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { number: 'desc' },
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        skip,
        take: limit,
        orderBy: { number: 'desc' },
      }),
      this.prisma.invoice.count(),
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
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Fatura bulunamadı.');
    return invoice;
  }
}
