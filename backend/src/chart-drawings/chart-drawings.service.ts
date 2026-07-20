import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChartDrawingsService {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, symbol: string, context: string, drawings: any) {
    return this.prisma.chartDrawing.upsert({
      where: { userId_symbol_context: { userId, symbol, context } },
      update: { drawings },
      create: { userId, symbol, context, drawings },
    });
  }

  async get(userId: string, symbol: string, context: string) {
    return this.prisma.chartDrawing.findUnique({
      where: { userId_symbol_context: { userId, symbol, context } },
    });
  }

  async remove(userId: string, symbol: string, context: string) {
    const exists = await this.prisma.chartDrawing.findUnique({
      where: { userId_symbol_context: { userId, symbol, context } },
    });

    if (!exists) return { message: 'Zaten kayıtlı çizim yok.' };

    await this.prisma.chartDrawing.delete({
      where: { userId_symbol_context: { userId, symbol, context } },
    });

    return { message: 'Silindi.' };
  }
}
