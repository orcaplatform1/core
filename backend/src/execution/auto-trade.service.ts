import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BinanceFuturesClientService } from './binance-futures-client.service';
import { BinanceUserStreamService, OrderFillEvent } from './binance-user-stream.service';

// TP1'de bankaya yatan pay, TP2'de bankaya yatan pay - scanner.service.ts
// computeSignalStats'taki TP1_BANKED_FRACTION/TP2_BANKED_FRACTION ile BIREBIR
// ayni olmali (istatistik ve gercek yurutme ayni pozisyon modelini varsaymali).
const TP1_QTY_FRACTION = 0.5;
const TP2_QTY_FRACTION = 0.25;

// Sinyalleri GERCEK Binance Futures emirlerine ceviren yurutme motoru.
// Kullanici istegi 2026-08-20: "sistemi hazırla... stop entry'e kadar kendi
// çeksin... bana hiçbişi sorma otomatik yap" - AMA "ne zaman başarı oranımız
// belli dedik... başlarız" de dedigi icin varsayilan KAPALI (AutoTradeConfig.
// enabled=false, testnet=true) - kullanici hazir oldugunda admin endpoint'ten
// acacak. Bu iki bagimsiz anahtar + .env'de gercek API key sarti olmadan HICBIR
// gercek emir gitmez (bkz. isActive()).
//
// Akis: onSignalCreated -> LIMIT giris emri (borsa doldurur) -> ORDER_TRADE_UPDATE
// (websocket, anlik) -> SL+TP1+TP2+TP3 emirleri acilir -> TP1 dolunca stop
// otomatik basabasa cekilir -> TP2/TP3/SL dolunca pozisyon kapanir. Fiyat
// pollamiyoruz - hepsi borsanin kendi fill bildirimiyle tetikleniyor.
@Injectable()
export class AutoTradeService implements OnModuleInit {
  private readonly logger = new Logger(AutoTradeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly binance: BinanceFuturesClientService,
    private readonly userStream: BinanceUserStreamService,
  ) {}

  onModuleInit() {
    this.userStream.onOrderUpdate((event) => {
      this.handleFill(event).catch((err) =>
        this.logger.error(`handleFill hatasi (${event.symbol}/${event.orderId}): ${err.message}`),
      );
    });
  }

  private async getConfig() {
    const existing = await this.prisma.autoTradeConfig.findFirst();
    if (existing) return existing;
    return this.prisma.autoTradeConfig.create({ data: {} });
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

  // scanner.service.ts createTrackedSignals icinde her yeni WATCHING kaydi
  // sonrasi cagrilir.
  async onSignalCreated(sig: {
    id: string;
    symbol: string;
    direction: string;
    market: string;
    entryZoneTop: number;
    entryZoneBottom: number;
    stop: number;
  }) {
    if (sig.market !== 'CRYPTO') return; // Binance Futures'ta forex kontrati yok
    if (!(await this.isActive())) return;

    try {
      const config = await this.getConfig();
      if (!config.cryptoEnabled) return;

      const bullish = sig.direction === 'LONG';
      const entryPrice = bullish ? sig.entryZoneTop : sig.entryZoneBottom;
      const riskDistance = Math.abs(entryPrice - sig.stop);
      if (riskDistance <= 0) return;

      const riskAmount = config.riskPerTradeUsdt;
      const filters = await this.binance.getSymbolFilters(sig.symbol);
      const rawQty = riskAmount / riskDistance;
      const qty = this.binance.roundToStep(rawQty, filters.stepSize);
      if (qty < filters.minQty || qty * entryPrice < filters.minNotional) {
        this.logger.warn(`${sig.symbol}: hesaplanan miktar cok kucuk (qty=${qty}), otomatik islem atlandi`);
        return;
      }

      // Binance sembol basina farkli max kaldirac izni verir (bazen 100x'i
      // 50x/20x'e kisitlar) - ayarlanan deger dogrudan gonderilmez, once
      // sembolun izin verdigi tavana kirpilir (bkz. getMaxLeverage yorumu).
      const maxLeverage = await this.binance.getMaxLeverage(sig.symbol);
      const effectiveLeverage = Math.min(config.leverage, maxLeverage);
      if (effectiveLeverage < config.leverage) {
        this.logger.log(`${sig.symbol}: kaldirac ${config.leverage}x -> ${effectiveLeverage}x'e kirpildi (Binance bu sembolde max ${maxLeverage}x izin veriyor)`);
      }
      await this.binance.setLeverage(sig.symbol, effectiveLeverage);
      const entryPriceRounded = this.binance.roundToStep(entryPrice, filters.tickSize);
      const order = await this.binance.placeOrder({
        symbol: sig.symbol,
        side: bullish ? 'BUY' : 'SELL',
        type: 'LIMIT',
        quantity: qty,
        price: entryPriceRounded,
      });

      await this.prisma.autoTrade.create({
        data: {
          trackedSignalId: sig.id,
          symbol: sig.symbol,
          direction: sig.direction,
          status: 'PENDING_ENTRY',
          entryOrderId: String(order.orderId),
          qty,
        },
      });
      this.logger.log(`${sig.symbol} ${sig.direction}: giris emri acildi (qty=${qty}, price=${entryPriceRounded})`);
    } catch (err: any) {
      this.logger.error(`onSignalCreated hatasi (${sig.symbol}): ${err.message}`);
      await this.notifyAdmins('Orca ACS: Otomatik işlem hatası', `${sig.symbol} için giriş emri açılamadı: ${err.message}`);
    }
  }

  // scanner.service.ts updateTrackedSignals icinde status INVALIDATED/EXPIRED
  // olunca (giris hic dolmadan setup gecersizlesince) cagrilir.
  async onSignalInvalidated(trackedSignalId: string) {
    const trade = await this.prisma.autoTrade.findUnique({ where: { trackedSignalId } });
    if (!trade || trade.status !== 'PENDING_ENTRY' || !trade.entryOrderId) return;

    try {
      await this.binance.cancelOrder(trade.symbol, trade.entryOrderId);

      // Guvenlik agi: emir iptal edilmeden hemen once kismen dolmus olabilir -
      // borsada gercekten korumasiz (SL'siz) bir pozisyon kaldiysa hemen
      // piyasa fiyatindan kapat, "gece uyurken korumasiz pozisyon" riskini
      // sifirla.
      const positionAmt = await this.binance.getPositionAmt(trade.symbol);
      if (Math.abs(positionAmt) > 0) {
        await this.binance.placeOrder({
          symbol: trade.symbol,
          side: positionAmt > 0 ? 'SELL' : 'BUY',
          type: 'MARKET',
          quantity: Math.abs(positionAmt),
          reduceOnly: true,
        });
        await this.notifyAdmins(
          'Orca ACS: Kısmi dolan emir güvenlik ağı',
          `${trade.symbol}: setup geçersizleşti, kısmi dolmuş ${Math.abs(positionAmt)} miktarındaki korumasız pozisyon piyasa fiyatından kapatıldı.`,
        );
      }

      await this.prisma.autoTrade.update({ where: { id: trade.id }, data: { status: 'EXPIRED' } });
    } catch (err: any) {
      this.logger.error(`onSignalInvalidated hatasi (${trade.symbol}): ${err.message}`);
      await this.notifyAdmins('Orca ACS: Otomatik işlem hatası', `${trade.symbol} giriş emri iptal edilirken hata: ${err.message}`);
    }
  }

  private async handleFill(event: OrderFillEvent) {
    if (event.status !== 'FILLED') return;
    const orderIdStr = String(event.orderId);

    const trade = await this.prisma.autoTrade.findFirst({
      where: {
        symbol: event.symbol,
        status: { in: ['PENDING_ENTRY', 'OPEN', 'BREAKEVEN_SET'] },
        OR: [
          { entryOrderId: orderIdStr },
          { slOrderId: orderIdStr },
          { tp1OrderId: orderIdStr },
          { tp2OrderId: orderIdStr },
          { tp3OrderId: orderIdStr },
        ],
      },
    });
    if (!trade) return;

    if (trade.entryOrderId === orderIdStr) return this.onEntryFilled(trade, event);
    if (trade.tp1OrderId === orderIdStr) return this.onTp1Filled(trade, event);
    if (trade.tp2OrderId === orderIdStr) return this.onTp2Filled(trade);
    if (trade.tp3OrderId === orderIdStr) return this.onPositionClosed(trade, 'TP3');
    if (trade.slOrderId === orderIdStr) return this.onPositionClosed(trade, 'STOP');
  }

  private async onEntryFilled(trade: { id: string; symbol: string; direction: string; trackedSignalId: string }, event: OrderFillEvent) {
    try {
      const sig = await this.prisma.trackedSignal.findUnique({ where: { id: trade.trackedSignalId } });
      if (!sig) return;

      const bullish = trade.direction === 'LONG';
      const closeSide: 'BUY' | 'SELL' = bullish ? 'SELL' : 'BUY';
      const filters = await this.binance.getSymbolFilters(trade.symbol);
      const totalQty = event.filledQty;
      const tp1Qty = this.binance.roundToStep(totalQty * TP1_QTY_FRACTION, filters.stepSize);
      const tp2Qty = this.binance.roundToStep(totalQty * TP2_QTY_FRACTION, filters.stepSize);
      const tp3Qty = this.binance.roundToStep(totalQty - tp1Qty - tp2Qty, filters.stepSize);

      const slOrder = await this.binance.placeOrder({
        symbol: trade.symbol,
        side: closeSide,
        type: 'STOP_MARKET',
        stopPrice: this.binance.roundToStep(sig.stop, filters.tickSize),
        quantity: totalQty,
        reduceOnly: true,
      });
      const tp1Order = await this.binance.placeOrder({
        symbol: trade.symbol,
        side: closeSide,
        type: 'LIMIT',
        price: this.binance.roundToStep(sig.tp1, filters.tickSize),
        quantity: tp1Qty,
        reduceOnly: true,
      });
      const tp2Order = await this.binance.placeOrder({
        symbol: trade.symbol,
        side: closeSide,
        type: 'LIMIT',
        price: this.binance.roundToStep(sig.tp2, filters.tickSize),
        quantity: tp2Qty,
        reduceOnly: true,
      });
      const tp3Order = await this.binance.placeOrder({
        symbol: trade.symbol,
        side: closeSide,
        type: 'LIMIT',
        price: this.binance.roundToStep(sig.tp3, filters.tickSize),
        quantity: tp3Qty,
        reduceOnly: true,
      });

      await this.prisma.autoTrade.update({
        where: { id: trade.id },
        data: {
          status: 'OPEN',
          entryPrice: event.avgPrice,
          qty: totalQty,
          entryFilledAt: new Date(),
          slOrderId: String(slOrder.orderId),
          tp1OrderId: String(tp1Order.orderId),
          tp2OrderId: String(tp2Order.orderId),
          tp3OrderId: String(tp3Order.orderId),
        },
      });
      await this.notifyAdmins(
        'Orca ACS: Gerçek pozisyon açıldı',
        `${trade.symbol} ${trade.direction} @ ${event.avgPrice} (qty=${totalQty}) - SL/TP1/TP2/TP3 emirleri yerleşti.`,
      );
    } catch (err: any) {
      this.logger.error(`onEntryFilled hatasi (${trade.symbol}): ${err.message}`);
      await this.prisma.autoTrade.update({ where: { id: trade.id }, data: { status: 'FAILED', errorMessage: err.message } });
      await this.notifyAdmins(
        'Orca ACS: KRİTİK - pozisyon korumasız',
        `${trade.symbol}: giriş doldu ama SL/TP emirleri açılamadı (${err.message}). Pozisyonu ELLE kontrol et.`,
      );
    }
  }

  private async onTp1Filled(trade: { id: string; symbol: string; direction: string; slOrderId: string | null; qty: number | null }, event: OrderFillEvent) {
    try {
      if (trade.slOrderId) await this.binance.cancelOrder(trade.symbol, trade.slOrderId);
      const bullish = trade.direction === 'LONG';
      const closeSide: 'BUY' | 'SELL' = bullish ? 'SELL' : 'BUY';
      const filters = await this.binance.getSymbolFilters(trade.symbol);
      const remainingQty = this.binance.roundToStep((trade.qty ?? 0) - event.filledQty, filters.stepSize);
      const breakevenPrice = event.avgPrice; // TP1 emrinin doldugu fiyat degil, pozisyonun giris fiyati lazim

      const autoTradeRow = await this.prisma.autoTrade.findUnique({ where: { id: trade.id } });
      const entryPrice = autoTradeRow?.entryPrice ?? breakevenPrice;

      const newSl = await this.binance.placeOrder({
        symbol: trade.symbol,
        side: closeSide,
        type: 'STOP_MARKET',
        stopPrice: this.binance.roundToStep(entryPrice, filters.tickSize),
        quantity: remainingQty,
        reduceOnly: true,
      });
      await this.prisma.autoTrade.update({
        where: { id: trade.id },
        data: { status: 'BREAKEVEN_SET', slOrderId: String(newSl.orderId) },
      });
      await this.notifyAdmins('Orca ACS: TP1 alındı', `${trade.symbol}: TP1 doldu, stop başabaşa (${entryPrice}) çekildi.`);
    } catch (err: any) {
      this.logger.error(`onTp1Filled hatasi (${trade.symbol}): ${err.message}`);
      await this.notifyAdmins(
        'Orca ACS: KRİTİK - stop başabaşa çekilemedi',
        `${trade.symbol}: TP1 doldu ama yeni stop emri açılamadı (${err.message}). Pozisyonu ELLE kontrol et.`,
      );
    }
  }

  private async onTp2Filled(trade: { id: string; symbol: string }) {
    // Kural: TP2'de kalan %25 icin stop DEGISMEZ (TP1'de basabasa cekilen
    // stop zaten aktif) - sadece bilgilendirme, emir islemi yok.
    await this.notifyAdmins('Orca ACS: TP2 alındı', `${trade.symbol}: TP2 doldu, kalan pozisyon için stop başabaşta sabit kalıyor.`);
  }

  private async onPositionClosed(
    trade: {
      id: string;
      symbol: string;
      status: string;
      slOrderId: string | null;
      tp1OrderId: string | null;
      tp2OrderId: string | null;
      tp3OrderId: string | null;
      entryFilledAt: Date | null;
    },
    reason: 'TP3' | 'STOP',
  ) {
    try {
      const remainingOrders = [trade.slOrderId, trade.tp1OrderId, trade.tp2OrderId, trade.tp3OrderId].filter(
        (id): id is string => !!id,
      );
      await Promise.all(remainingOrders.map((id) => this.binance.cancelOrder(trade.symbol, id)));

      // TP1'den ONCE stop = gercek tam kayip. TP1'DEN SONRA (BREAKEVEN_SET
      // durumundayken) stop = basabas, TP1'in kari zaten bankaya yatmisti,
      // bu bir kayip DEGIL - bkz. AutoTrade.closeReason yorumu.
      const closeReason: string =
        reason === 'TP3' ? 'TP3' : trade.status === 'BREAKEVEN_SET' ? 'STOP_BREAKEVEN' : 'STOP_FULL_LOSS';

      let pnl = { realizedPnl: 0, commission: 0, funding: 0, netTotal: 0 };
      if (trade.entryFilledAt) {
        pnl = await this.binance.getRealizedPnlBreakdown(trade.symbol, trade.entryFilledAt.getTime(), Date.now());
      }

      await this.prisma.autoTrade.update({
        where: { id: trade.id },
        data: {
          status: 'CLOSED',
          closeReason,
          realizedPnl: pnl.realizedPnl,
          commission: pnl.commission,
          funding: pnl.funding,
          netPnl: pnl.netTotal,
        },
      });
      const pnlLabel = `net ${pnl.netTotal >= 0 ? '+' : ''}$${pnl.netTotal.toFixed(2)} (işlem ${pnl.realizedPnl.toFixed(2)}, komisyon ${pnl.commission.toFixed(2)}, funding ${pnl.funding.toFixed(2)})`;
      await this.notifyAdmins(
        'Orca ACS: Pozisyon kapandı',
        `${trade.symbol}: ${closeReason === 'TP3' ? 'TP3 ile (tam kazanç)' : closeReason === 'STOP_BREAKEVEN' ? 'başabaş stop ile (TP1 karı banka kaldı)' : 'stop ile (kayıp)'} kapandı - ${pnlLabel}.`,
      );
    } catch (err: any) {
      this.logger.error(`onPositionClosed hatasi (${trade.symbol}): ${err.message}`);
    }
  }

  // GERCEK (Binance'ten cekilen) toplu istatistik - AutoTradeController
  // /scanner/auto-trade/stats tarafindan kullanilir. Simulasyondaki
  // computeSignalStats'in R-multiple TAHMININDEN farkli olarak burada
  // hersey (kazanc, komisyon, funding, net) Binance'in kendi kayitlarindan
  // geliyor - kullanici istegi 2026-08-20: "funding ve fee de ekle, net
  // kar... görelim herşeyi".
  async getStats() {
    const closed = await this.prisma.autoTrade.findMany({ where: { status: 'CLOSED' } });
    const wins = closed.filter((t) => t.closeReason === 'TP3' || t.closeReason === 'STOP_BREAKEVEN');
    const losses = closed.filter((t) => t.closeReason === 'STOP_FULL_LOSS');
    const sum = (rows: typeof closed, field: 'realizedPnl' | 'commission' | 'funding' | 'netPnl') =>
      rows.reduce((acc, r) => acc + (r[field] ?? 0), 0);
    return {
      totalClosed: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: wins.length + losses.length > 0 ? Math.round((wins.length / (wins.length + losses.length)) * 100) : null,
      totalRealizedPnl: sum(closed, 'realizedPnl'),
      totalCommission: sum(closed, 'commission'),
      totalFunding: sum(closed, 'funding'),
      totalNetPnl: sum(closed, 'netPnl'),
    };
  }

  // Paneldeki acik pozisyon kartlari icin - Binance'e hic girmeden anlik
  // kar/zarar, mark fiyat, pozisyon buyuklugu ve o ana kadar odenen komisyon/
  // funding'i gormek icin (kullanici istegi 2026-08-20: "her kartta anlık ne
  // kadar kazanıyoruz kaybediyoruz... ödenen fee ve funding ücreti de yer
  // alsın, ben işlemler için manuel Binance Futures'e girmiyim"). Kismi TP1/
  // TP2 dolmus olsa bile pozisyon acik sayildigi surece (OPEN/BREAKEVEN_SET)
  // burada listelenir.
  async getLivePositions() {
    const openTrades = await this.prisma.autoTrade.findMany({
      where: { status: { in: ['OPEN', 'BREAKEVEN_SET'] } },
      orderBy: { createdAt: 'desc' },
    });
    const results = await Promise.all(
      openTrades.map(async (trade) => {
        const [risk, pnlSoFar] = await Promise.all([
          this.binance.getPositionRisk(trade.symbol).catch(() => null),
          trade.entryFilledAt
            ? this.binance.getRealizedPnlBreakdown(trade.symbol, trade.entryFilledAt.getTime(), Date.now()).catch(
                () => ({ realizedPnl: 0, commission: 0, funding: 0, netTotal: 0 }),
              )
            : Promise.resolve({ realizedPnl: 0, commission: 0, funding: 0, netTotal: 0 }),
        ]);
        return {
          id: trade.id,
          symbol: trade.symbol,
          direction: trade.direction,
          status: trade.status,
          entryPrice: trade.entryPrice,
          qty: trade.qty,
          markPrice: risk?.markPrice ?? null,
          unrealizedProfit: risk?.unrealizedProfit ?? null,
          notional: risk?.notional ?? null,
          leverage: risk?.leverage ?? null,
          liquidationPrice: risk?.liquidationPrice ?? null,
          // Simdiye kadar (TP1/TP2 kismi kapanislarindan) bankaya yatmis kar +
          // o ana kadar tahakkuk etmis komisyon/funding - hala acik olan
          // dilimin unrealizedProfit'i BUNA DAHIL DEGIL, ayri gosteriliyor.
          realizedSoFar: pnlSoFar.realizedPnl,
          commissionSoFar: pnlSoFar.commission,
          fundingSoFar: pnlSoFar.funding,
        };
      }),
    );
    return results;
  }

  // Tek bir pozisyonu ELLE kapatir (kullanici panelden "Kapat" butonuna
  // basinca) - kalan tum emirleri iptal eder, borsada hala acik pozisyon
  // varsa piyasa fiyatindan kapatir, gercek PnL'i kaydeder.
  async closePosition(tradeId: string) {
    const trade = await this.prisma.autoTrade.findUnique({ where: { id: tradeId } });
    if (!trade) throw new Error('İşlem bulunamadı');
    if (trade.status === 'PENDING_ENTRY') {
      await this.onSignalInvalidated(trade.trackedSignalId);
      return;
    }
    if (trade.status !== 'OPEN' && trade.status !== 'BREAKEVEN_SET') {
      throw new Error('İşlem zaten kapalı');
    }

    const orderIds = [trade.slOrderId, trade.tp1OrderId, trade.tp2OrderId, trade.tp3OrderId].filter(
      (id): id is string => !!id,
    );
    await Promise.all(orderIds.map((id) => this.binance.cancelOrder(trade.symbol, id)));

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

    let pnl = { realizedPnl: 0, commission: 0, funding: 0, netTotal: 0 };
    if (trade.entryFilledAt) {
      pnl = await this.binance.getRealizedPnlBreakdown(trade.symbol, trade.entryFilledAt.getTime(), Date.now());
    }
    await this.prisma.autoTrade.update({
      where: { id: trade.id },
      data: {
        status: 'CLOSED',
        closeReason: 'MANUAL_CLOSE',
        realizedPnl: pnl.realizedPnl,
        commission: pnl.commission,
        funding: pnl.funding,
        netPnl: pnl.netTotal,
      },
    });
    await this.notifyAdmins(
      'Orca ACS: Pozisyon elle kapatıldı',
      `${trade.symbol}: panelden elle kapatıldı - net ${pnl.netTotal >= 0 ? '+' : ''}$${pnl.netTotal.toFixed(2)}.`,
    );
  }

  // Panelin en ustundeki "Tüm İşlemleri Kapat" butonu icin.
  async closeAllPositions() {
    const openTrades = await this.prisma.autoTrade.findMany({
      where: { status: { in: ['PENDING_ENTRY', 'OPEN', 'BREAKEVEN_SET'] } },
    });
    for (const trade of openTrades) {
      await this.closePosition(trade.id).catch((err) =>
        this.logger.error(`closeAllPositions: ${trade.symbol} kapatilamadi: ${err.message}`),
      );
    }
    return { closed: openTrades.length };
  }

  // kaydi silinmeden once borsadaki acik emirleri de temizler, aksi halde
  // "sinyal silindi ama borsada hala emir/pozisyon var" durumu olusabilir.
  async cancelAllOpenForMarket(market: string) {
    if (market !== 'CRYPTO') return;
    const openTrades = await this.prisma.autoTrade.findMany({
      where: { status: { in: ['PENDING_ENTRY', 'OPEN', 'BREAKEVEN_SET'] } },
    });
    for (const trade of openTrades) {
      const orderIds = [trade.entryOrderId, trade.slOrderId, trade.tp1OrderId, trade.tp2OrderId, trade.tp3OrderId].filter(
        (id): id is string => !!id,
      );
      for (const id of orderIds) {
        await this.binance.cancelOrder(trade.symbol, id);
      }
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
      await this.prisma.autoTrade.update({ where: { id: trade.id }, data: { status: 'CLOSED' } });
    }
  }
}
