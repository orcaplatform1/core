import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BinanceFuturesClientService } from '../execution/binance-futures-client.service';
import { BinanceUserStreamService, OrderFillEvent } from '../execution/binance-user-stream.service';
import { NewsClassifierService } from './news-classifier.service';
import { XStreamService, XNewsEvent } from './x-stream.service';

// Terminal News Trade: X'te yayinlanan haberi Orca AI (Claude) ile siniflandirip
// -- SADECE surdurulebilir hareket gosteren birkac kategori icin (bkz.
// news-classifier.service.ts TRADABLE_CATEGORIES) -- dogrudan Binance Futures
// MARKET emrine ceviren, Money Maker'dan (Orca ACS sinyalleri) TAMAMEN bagimsiz
// ikinci bir yurutme katmani. Varsayilan config (enabled=false, shadowMode=true)
// hicbir gercek/testnet emir gitmemesini saglar; kullanici admin panelden
// bilerek acana kadar sadece golge kayit tutulur (bkz. TerminalNewsTradeConfig).
//
// Akis: XStreamService'ten tweet -> NewsEvent olusturulur -> NewsClassifierService
// ile siniflandirilir (kategori/yon/sembol/guven/dogrulama) -> tradable=false ise
// sadece loglanip durulur -> tradable=true ise MARKET giris + STOP_MARKET
// (haber-oncesi pivot) emri acilir (ya da shadowMode'da sadece simule edilir).
// Money Maker'daki TP1/TP2/TP3 kademeli kapama modeli burada YOK - kullanici
// henuz bir TP semasi belirtmedi, pozisyon sadece pivot stop ile korunur,
// kapanis admin panelinden elle veya stop ile olur.
@Injectable()
export class TerminalNewsTradeService implements OnModuleInit {
  private readonly logger = new Logger(TerminalNewsTradeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly binance: BinanceFuturesClientService,
    private readonly userStream: BinanceUserStreamService,
    private readonly classifier: NewsClassifierService,
    private readonly xStream: XStreamService,
  ) {}

  onModuleInit() {
    this.xStream.onNews((event) => {
      this.onNewsEvent(event).catch((err) => this.logger.error(`onNewsEvent hatasi (${event.sourceUrl}): ${err.message}`));
    });
    this.userStream.onOrderUpdate((event) => {
      this.handleFill(event).catch((err) => this.logger.error(`handleFill hatasi (${event.symbol}/${event.orderId}): ${err.message}`));
    });
  }

  private async getConfig() {
    const existing = await this.prisma.terminalNewsTradeConfig.findFirst();
    if (existing) return existing;
    return this.prisma.terminalNewsTradeConfig.create({ data: {} });
  }

  private async isActive(): Promise<boolean> {
    if (!this.binance.isConfigured) return false;
    const config = await this.getConfig();
    return config.enabled;
  }

  private async notifyAdmins(title: string, message: string) {
    const admins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
    await this.notifications.createForManyUsers(
      admins.map((a) => a.id),
      { type: 'SYSTEM', title, message },
    );
  }

  // XStreamService'ten her yeni tweet icin cagrilir.
  async onNewsEvent(raw: XNewsEvent) {
    const existing = await this.prisma.newsEvent.findUnique({ where: { sourceUrl: raw.sourceUrl } });
    if (existing) return; // ayni tweet iki kere islenmesin

    const classified = await this.classifier.classify(raw);
    if (!classified) {
      this.logger.warn(`${raw.sourceUrl}: siniflandirma basarisiz (ANTHROPIC_API_KEY tanimli mi?)`);
      return;
    }

    const newsEvent = await this.prisma.newsEvent.create({
      data: {
        sourceUrl: raw.sourceUrl,
        sourceAccount: raw.sourceAccount,
        rawText: raw.rawText,
        publishedAt: raw.publishedAt,
        category: classified.category as any,
        direction: classified.direction as any,
        confidenceScore: classified.confidenceScore,
        tradable: classified.tradable,
        verified: classified.verified,
        verificationNotes: classified.verificationNotes,
        aiSummary: classified.aiSummary,
        classifiedAt: new Date(),
      },
    });

    if (!classified.tradable || !classified.symbol || classified.direction === 'NEUTRAL') return;
    await this.tryOpenTrade(newsEvent.id, classified.symbol, classified.direction, raw.publishedAt);
  }

  private async tryOpenTrade(newsEventId: string, symbol: string, direction: 'LONG' | 'SHORT', publishedAt: Date) {
    const config = await this.getConfig();
    const active = await this.isActive();
    const shadow = !active || config.shadowMode;

    try {
      const lastPrice = await this.binance.getLastPrice(symbol);
      const pivotStop = await this.computePivotStop(symbol, direction, publishedAt);
      const riskDistance = Math.abs(lastPrice - pivotStop);
      if (riskDistance <= 0) {
        this.logger.warn(`${symbol}: pivot stop mesafesi gecersiz, islem atlandi`);
        return;
      }

      const filters = await this.binance.getSymbolFilters(symbol);
      const rawQty = config.riskPerTradeUsdt / riskDistance;
      const qty = this.binance.roundToStep(rawQty, filters.stepSize);
      const pivotStopRounded = this.binance.roundToStep(pivotStop, filters.tickSize);
      if (qty < filters.minQty || qty * lastPrice < filters.minNotional) {
        this.logger.warn(`${symbol}: hesaplanan miktar cok kucuk (qty=${qty}), islem atlandi`);
        return;
      }

      if (shadow) {
        const latencyMs = Date.now() - publishedAt.getTime();
        const latencyNote = await this.classifier.explainLatency({ latencyMs, shadow: true, symbol });
        await this.prisma.newsTrade.create({
          data: {
            newsEventId,
            symbol,
            direction: direction as any,
            status: 'SHADOW_ONLY',
            entryPrice: lastPrice,
            qty,
            pivotStopPrice: pivotStopRounded,
            entryFilledAt: new Date(),
            entryLatencyMs: latencyMs,
            entryLatencyNote: latencyNote,
          },
        });
        this.logger.log(
          `${symbol} ${direction}: GOLGE MOD - gercek islem acilmadi (acilsaydi @ ${lastPrice}, stop ${pivotStopRounded})`,
        );
        return;
      }

      const maxLeverage = await this.binance.getMaxLeverage(symbol);
      const effectiveLeverage = Math.min(config.leverage, maxLeverage);
      await this.binance.setLeverage(symbol, effectiveLeverage);

      const order = await this.binance.placeOrder({
        symbol,
        side: direction === 'LONG' ? 'BUY' : 'SELL',
        type: 'MARKET',
        quantity: qty,
      });
      const entryPrice = order.avgPrice ? parseFloat(order.avgPrice) : lastPrice;
      const latencyMs = Date.now() - publishedAt.getTime();
      const latencyNote = await this.classifier.explainLatency({ latencyMs, shadow: false, symbol });

      const slOrder = await this.binance.placeOrder({
        symbol,
        side: direction === 'LONG' ? 'SELL' : 'BUY',
        type: 'STOP_MARKET',
        stopPrice: pivotStopRounded,
        quantity: qty,
        reduceOnly: true,
      });

      await this.prisma.newsTrade.create({
        data: {
          newsEventId,
          symbol,
          direction: direction as any,
          status: 'OPEN',
          entryOrderId: String(order.orderId),
          slOrderId: String(slOrder.orderId),
          entryPrice,
          qty,
          pivotStopPrice: pivotStopRounded,
          entryFilledAt: new Date(),
          entryLatencyMs: latencyMs,
          entryLatencyNote: latencyNote,
        },
      });
      await this.notifyAdmins(
        'Terminal News Trade: Gerçek pozisyon açıldı',
        `${symbol} ${direction} @ ${entryPrice} (qty=${qty}) - haberden ${(latencyMs / 1000).toFixed(1)}sn sonra, stop ${pivotStopRounded}.`,
      );
    } catch (err: any) {
      this.logger.error(`tryOpenTrade hatasi (${symbol}): ${err.message}`);
      await this.prisma.newsTrade
        .create({ data: { newsEventId, symbol, direction: direction as any, status: 'FAILED', errorMessage: err.message } })
        .catch(() => {});
      await this.notifyAdmins('Terminal News Trade: İşlem hatası', `${symbol}: giriş açılamadı: ${err.message}`);
    }
  }

  // scanner.service.ts'deki ATR-tabanli stop deseninin sadelestirilmis hali
  // (bagimsiz, kucuk bir yardimci fonksiyon - scanner modulune bagimlilik
  // kurulmuyor, bkz. plan). Haber oncesi son N 1-dakikalik mumun swing
  // high/low'u + kucuk bir oynaklik tamponu = "haber öncesi pivot altı/üstü".
  private async computePivotStop(symbol: string, direction: 'LONG' | 'SHORT', publishedAt: Date): Promise<number> {
    const candles = await this.binance.getRecentCandles(symbol, publishedAt.getTime(), 30, '1m');
    if (candles.length === 0) throw new Error(`${symbol} icin haber-oncesi mum verisi alinamadi`);
    const avgRange = candles.reduce((s, c) => s + (c.high - c.low), 0) / candles.length;
    const buffer = avgRange * 0.5;
    return direction === 'LONG'
      ? Math.min(...candles.map((c) => c.low)) - buffer
      : Math.max(...candles.map((c) => c.high)) + buffer;
  }

  private async handleFill(event: OrderFillEvent) {
    if (event.status !== 'FILLED') return;
    const orderIdStr = String(event.orderId);
    const trade = await this.prisma.newsTrade.findFirst({
      where: { symbol: event.symbol, status: 'OPEN', slOrderId: orderIdStr },
    });
    if (!trade) return;
    await this.onPositionClosed(trade, 'STOP');
  }

  private async onPositionClosed(
    trade: { id: string; symbol: string; entryFilledAt: Date | null },
    reason: 'STOP' | 'MANUAL_CLOSE',
  ) {
    try {
      let pnl = { realizedPnl: 0, commission: 0, funding: 0, netTotal: 0 };
      if (trade.entryFilledAt) {
        pnl = await this.binance.getRealizedPnlBreakdown(trade.symbol, trade.entryFilledAt.getTime(), Date.now());
      }
      await this.prisma.newsTrade.update({
        where: { id: trade.id },
        data: {
          status: 'CLOSED',
          closeReason: reason,
          realizedPnl: pnl.realizedPnl,
          commission: pnl.commission,
          funding: pnl.funding,
          netPnl: pnl.netTotal,
        },
      });
      await this.notifyAdmins(
        'Terminal News Trade: Pozisyon kapandı',
        `${trade.symbol}: ${reason === 'STOP' ? 'stop ile' : 'elle'} kapandı - net ${pnl.netTotal >= 0 ? '+' : ''}$${pnl.netTotal.toFixed(2)}.`,
      );
    } catch (err: any) {
      this.logger.error(`onPositionClosed hatasi (${trade.symbol}): ${err.message}`);
    }
  }

  // GERCEK (Binance'ten cekilen) toplu istatistik - Money Maker'in getStats()'i
  // gibi TAHMIN degil, ama kaynak/istatistik tablosu tamamen ayri (kullanici
  // istegi 2026-08-20: "istatistiği ayrı tutmalıyım").
  async getStats() {
    const closed = await this.prisma.newsTrade.findMany({ where: { status: 'CLOSED' } });
    const wins = closed.filter((t) => (t.netPnl ?? 0) > 0);
    const losses = closed.filter((t) => (t.netPnl ?? 0) <= 0);
    const sum = (rows: typeof closed, field: 'realizedPnl' | 'commission' | 'funding' | 'netPnl') =>
      rows.reduce((acc, r) => acc + (r[field] ?? 0), 0);
    return {
      totalClosed: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : null,
      totalRealizedPnl: sum(closed, 'realizedPnl'),
      totalCommission: sum(closed, 'commission'),
      totalFunding: sum(closed, 'funding'),
      totalNetPnl: sum(closed, 'netPnl'),
    };
  }

  // Panelde her kartta Money Maker'daki futures pozisyon bilgilerinin AYNISI
  // (mark fiyat, notional, kaldirac, likidasyon, anlik kar/zarar) + Orca AI'nin
  // doğrulama notu/özeti + haber-giriş gecikmesi notu (kullanici istegi
  // 2026-08-20: "kartların altında Orca AI yazsın, haberin doğrulanıp
  // doğrulanmadığı veya notları olsun, detay özeti, gecikmesi").
  async getLivePositions() {
    const openTrades = await this.prisma.newsTrade.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      include: { newsEvent: true },
    });
    return Promise.all(
      openTrades.map(async (trade) => {
        const [risk, pnlSoFar] = await Promise.all([
          this.binance.getPositionRisk(trade.symbol).catch(() => null),
          trade.entryFilledAt
            ? this.binance
                .getRealizedPnlBreakdown(trade.symbol, trade.entryFilledAt.getTime(), Date.now())
                .catch(() => ({ realizedPnl: 0, commission: 0, funding: 0, netTotal: 0 }))
            : Promise.resolve({ realizedPnl: 0, commission: 0, funding: 0, netTotal: 0 }),
        ]);
        return {
          id: trade.id,
          symbol: trade.symbol,
          direction: trade.direction,
          status: trade.status,
          entryPrice: trade.entryPrice,
          qty: trade.qty,
          pivotStopPrice: trade.pivotStopPrice,
          entryLatencyMs: trade.entryLatencyMs,
          entryLatencyNote: trade.entryLatencyNote,
          markPrice: risk?.markPrice ?? null,
          unrealizedProfit: risk?.unrealizedProfit ?? null,
          notional: risk?.notional ?? null,
          leverage: risk?.leverage ?? null,
          liquidationPrice: risk?.liquidationPrice ?? null,
          realizedSoFar: pnlSoFar.realizedPnl,
          commissionSoFar: pnlSoFar.commission,
          fundingSoFar: pnlSoFar.funding,
          newsSourceUrl: trade.newsEvent.sourceUrl,
          newsSummary: trade.newsEvent.aiSummary,
          newsVerified: trade.newsEvent.verified,
          newsVerificationNotes: trade.newsEvent.verificationNotes,
          newsCategory: trade.newsEvent.category,
        };
      }),
    );
  }

  // Islem acilsin acilmasin HER haber burada listelenir - kategori filtresinin
  // neyi elediginin gorulebilmesi (audit/ince ayar) icin (bkz. plan: "loglanan
  // ama işlem açılmayan haberler" panel gereksinimi).
  async getEvents(limit = 100) {
    return this.prisma.newsEvent.findMany({ orderBy: { publishedAt: 'desc' }, take: limit, include: { trade: true } });
  }

  async closePosition(tradeId: string) {
    const trade = await this.prisma.newsTrade.findUnique({ where: { id: tradeId } });
    if (!trade) throw new Error('İşlem bulunamadı');
    if (trade.status !== 'OPEN') throw new Error('İşlem zaten kapalı veya gölge modda (gerçek pozisyon yok)');

    if (trade.slOrderId) await this.binance.cancelOrder(trade.symbol, trade.slOrderId);
    const positionAmt = await this.binance.getPositionAmt(trade.symbol).catch(() => 0);
    if (Math.abs(positionAmt) > 0) {
      await this.binance.placeOrder({
        symbol: trade.symbol,
        side: positionAmt > 0 ? 'SELL' : 'BUY',
        type: 'MARKET',
        quantity: Math.abs(positionAmt),
        reduceOnly: true,
      });
    }
    await this.onPositionClosed(trade, 'MANUAL_CLOSE');
  }

  async closeAllPositions() {
    const openTrades = await this.prisma.newsTrade.findMany({ where: { status: 'OPEN' } });
    for (const trade of openTrades) {
      await this.closePosition(trade.id).catch((err) => this.logger.error(`closeAllPositions: ${trade.symbol} kapatilamadi: ${err.message}`));
    }
    return { closed: openTrades.length };
  }
}
