import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        userId,
        amount: dto.amount,
        currency: dto.currency,
        method: dto.method as any,
        receiptUrl: dto.receiptUrl,
        status: 'PENDING',
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
