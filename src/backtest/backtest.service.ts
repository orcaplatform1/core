import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenBacktestTradeDto } from './dto/open-backtest-trade.dto';

@Injectable()
export class BacktestService {
  constructor(private readonly prisma: PrismaService) {}

  private async getPriceAt(symbol: string, date: Date): Promise<number> {
    const candle = await this.prisma.historicalCandle.findFirst({
      where: {
        symbol,
        timestamp: { lte: date },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!candle) {
      throw new NotFoundException(
        `${symbol} için ${date.toISOString()} tarihinde geçmiş veri bulunamadı. Veri yüklemesi gerekebilir.`,
      );
    }

    return candle.close;
  }

  async openTrade(userId: string, dto: OpenBacktestTradeDto) {
    const entryDate = new Date(dto.entryDate);
    const entryPrice = await this.getPriceAt(dto.symbol, entryDate);

    return this.prisma.backtestTrade.create({
      data: {
        userId,
        symbol: dto.symbol,
        direction: dto.direction as any,
        quantity: dto.quantity,
        entryPrice,
        entryDate,
        status: 'OPEN',
      },
    });
  }

  async closeTrade(userId: string, tradeId: string, exitDateStr: string) {
    const trade = await this.prisma.backtestTrade.findUnique({ where: { id: tradeId } });

    if (!trade || trade.userId !== userId) {
      throw new NotFoundException('İşlem bulunamadı.');
    }

    if (trade.status === 'CLOSED') {
      throw new BadRequestException('Bu işlem zaten kapatılmış.');
    }

    const exitDate = new Date(exitDateStr);
    const exitPrice = await this.getPriceAt(trade.symbol, exitDate);

    const pnl =
      trade.direction === 'BUY'
        ? (exitPrice - trade.entryPrice) * trade.quantity
        : (trade.entryPrice - exitPrice) * trade.quantity;

    return this.prisma.backtestTrade.update({
      where: { id: tradeId },
      data: {
        exitPrice,
        exitDate,
        pnl,
        status: 'CLOSED',
      },
    });
  }

  async getMyTrades(userId: string) {
    return this.prisma.backtestTrade.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCandles(symbol: string, from: string, to: string) {
    return this.prisma.historicalCandle.findMany({
      where: {
        symbol,
        timestamp: { gte: new Date(from), lte: new Date(to) },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getSymbols() {
    const rows = await this.prisma.historicalCandle.findMany({
      distinct: ['symbol'],
      select: { symbol: true, assetType: true },
      orderBy: { symbol: 'asc' },
    });

    return {
      crypto: rows.filter((r) => r.assetType === 'CRYPTO').map((r) => r.symbol),
      forex: rows.filter((r) => r.assetType === 'FOREX').map((r) => r.symbol),
    };
  }

  async refreshSymbol(symbol: string) {
    const latest = await this.prisma.historicalCandle.findFirst({
      where: { symbol },
      orderBy: { timestamp: 'desc' },
    });

    const startTime = latest ? latest.timestamp.getTime() + 1 : undefined;

    const url = new URL('https://api.binance.com/api/v3/klines');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', '1d');
    url.searchParams.set('limit', '1000');
    if (startTime) url.searchParams.set('startTime', String(startTime));

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new BadRequestException(`Binance'den veri alınamadı: ${symbol}`);
    }

    const candles = await res.json();

    let added = 0;

    for (const candle of candles) {
      const [openTime, open, high, low, close, volume] = candle;

      await this.prisma.historicalCandle.upsert({
        where: { symbol_timestamp: { symbol, timestamp: new Date(openTime) } },
        update: {},
        create: {
          symbol,
          assetType: 'CRYPTO',
          timestamp: new Date(openTime),
          open: parseFloat(open),
          high: parseFloat(high),
          low: parseFloat(low),
          close: parseFloat(close),
          volume: parseFloat(volume),
        },
      });
      added++;
    }

    return {
      symbol,
      newCandles: added,
      lastUpdate: new Date(),
    };
  }
}
