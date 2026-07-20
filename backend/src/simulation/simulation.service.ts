import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenTradeDto } from './dto/open-trade.dto';
import { BadgesService } from '../badges/badges.service';

const STARTING_BALANCE = 10000;

@Injectable()
export class SimulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
  ) {}

  private async getOrCreateAccount(userId: string) {
    let account = await this.prisma.simulationAccount.findUnique({ where: { userId } });

    if (!account) {
      account = await this.prisma.simulationAccount.create({
        data: { userId, balance: STARTING_BALANCE },
      });
    }

    return account;
  }

  private async fetchMarketPrice(symbol: string): Promise<number> {
    const apiKey = process.env.MARKET_DATA_API_KEY;

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Piyasa verisi API bağlantısı henüz yapılandırılmadı (MARKET_DATA_API_KEY eksik).',
      );
    }

    throw new ServiceUnavailableException('Piyasa verisi API entegrasyonu tamamlanmadı.');
  }

  async openTrade(userId: string, dto: OpenTradeDto) {
    const account = await this.getOrCreateAccount(userId);
    const price = await this.fetchMarketPrice(dto.symbol);

    return this.prisma.simulatedTrade.create({
      data: {
        accountId: account.id,
        symbol: dto.symbol,
        direction: dto.direction as any,
        quantity: dto.quantity,
        entryPrice: price,
        status: 'OPEN',
      },
    });
  }

  async closeTrade(userId: string, tradeId: string) {
    const account = await this.getOrCreateAccount(userId);

    const trade = await this.prisma.simulatedTrade.findUnique({ where: { id: tradeId } });

    if (!trade || trade.accountId !== account.id) {
      throw new NotFoundException('İşlem bulunamadı.');
    }

    if (trade.status === 'CLOSED') {
      throw new BadRequestException('Bu işlem zaten kapatılmış.');
    }

    const exitPrice = await this.fetchMarketPrice(trade.symbol);

    const pnl =
      trade.direction === 'BUY'
        ? (exitPrice - trade.entryPrice) * trade.quantity
        : (trade.entryPrice - exitPrice) * trade.quantity;

    const updated = await this.prisma.simulatedTrade.update({
      where: { id: tradeId },
      data: {
        exitPrice,
        pnl,
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    await this.prisma.simulationAccount.update({
      where: { id: account.id },
      data: { balance: { increment: pnl } },
    });

    const closedCount = await this.prisma.simulatedTrade.count({
      where: { accountId: account.id, status: 'CLOSED' },
    });

    await this.badgesService.checkAndGrant(userId, 'SIMULATION_COUNT', closedCount);

    return updated;
  }

  async getMyTrades(userId: string) {
    const account = await this.getOrCreateAccount(userId);

    return this.prisma.simulatedTrade.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyAccount(userId: string) {
    return this.getOrCreateAccount(userId);
  }
}
