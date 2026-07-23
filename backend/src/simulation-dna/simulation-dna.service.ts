import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class SimulationDnaService {
  constructor(private readonly prisma: PrismaService) {}
  async generate(userId: string, tradesAnalyzedCount: number) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return this.prisma.simulationDnaReport.create({
        data: {
          userId,
          tradesAnalyzedCount,
          pending: true,
        },
      });
    }
    return this.prisma.simulationDnaReport.create({
      data: {
        userId,
        tradesAnalyzedCount,
        pending: true,
      },
    });
  }
  async findMine(userId: string) {
    return this.prisma.simulationDnaReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
