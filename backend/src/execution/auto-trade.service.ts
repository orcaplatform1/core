import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BinanceFuturesClientService } from './binance-futures-client.service';
import { BinanceUserStreamService, OrderFillEvent } from './binance-user-stream.service';

// TP1'de bankaya yatan pay, TP2'de bankaya yatan pay - scanner.service.ts
// computeSignalStats'taki TP1_BANKED_FRACTION/TP2_BANKED_FRACTION ile BIREBIR
// ayni olmali (istatistik ve gercek yurutme ayni pozisyon modelini varsaymali).
const TP1_QTY_FRACTION = 0.5;
const TP2_QTY_FRACTION = 0.25;

// BTC korelasyon karti icin - iki kapanis serisinin bar-bar yuzde
// degisimleri arasindaki Pearson katsayisi (bkz. AutoTradeService.
// getMarketContext yorumu). En az 3 ortak bar yoksa (yeni listelenmis
// sembol vb.) null doner.
function pearsonReturnsCorrelation(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 3) return null;
  const retA: number[] = [];
  const retB: number[] = [];
  for (let i = 1; i < n; i++) {
    retA.push((a[i] - a[i - 1]) / a[i - 1]);
    retB.push((b[i] - b[i - 1]) / b[i - 1]);
  }
  const meanA = retA.reduce((s, v) => s + v, 0) / retA.length;
  const meanB = retB.reduce((s, v) => s + v, 0) / retB.length;
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < retA.length; i++) {
    const da = retA[i] - meanA;
    const db = retB[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  if (varA === 0 || varB === 0) return null;
  return cov / Math.sqrt(varA * varB);
}

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

      const entryPriceRounded = this.binance.roundToStep(entryPrice, filters.tickSize);

      // Binance kaldiraci NOTIONAL BUYUKLUGUNE gore kademeli sinirlar (orn.
      // 50x sadece kucuk bir notional'a kadar, sonrasi 25x/20x'e duser) -
      // sadece sembolun EN YUKSEK kaldiracina (getMaxLeverage) gore kirpmak
      // yetersizdi: dar bir stop mesafesi buyuk bir qty/notional urettiginde
      // o notional'in gercekte ait oldugu (daha dusuk kaldirachli) dilim
      // hesaba katilmadan emir gonderiliyor ve Binance -2027 "Exceeded the
      // maximum allowable position at current leverage" ile reddediyordu
      // (bkz. kullanici geri bildirimi 2026-08-20: UNIUSDT ve APTUSDT).
      const notional = qty * entryPriceRounded;
      const notionalLeverage = await this.binance.getLeverageForNotional(sig.symbol, notional);
      const effectiveLeverage = Math.min(config.leverage, notionalLeverage);
      if (effectiveLeverage < config.leverage) {
        this.logger.log(`${sig.symbol}: kaldirac ${config.leverage}x -> ${effectiveLeverage}x'e kirpildi (notional $${notional.toFixed(2)} icin Binance bu sembolde max ${notionalLeverage}x izin veriyor)`);
      }
      await this.binance.setLeverage(sig.symbol, effectiveLeverage);
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
      if (trade.slOrderId) await this.binance.cancelAlgoOrder(trade.symbol, trade.slOrderId);
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
      const remainingLimitOrders = [trade.tp1OrderId, trade.tp2OrderId, trade.tp3OrderId].filter(
        (id): id is string => !!id,
      );
      await Promise.all([
        ...remainingLimitOrders.map((id) => this.binance.cancelOrder(trade.symbol, id)),
        trade.slOrderId ? this.binance.cancelAlgoOrder(trade.symbol, trade.slOrderId) : Promise.resolve(),
      ]);

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

  // Stop-loss artik bir "algo" (kosullu) emir - Binance'in ALGO_UPDATE
  // websocket eventi (2026-08-20 itibariyle) belgelenmedigi icin diger
  // emirler gibi anlik push bildirimine guvenilemiyor; bu yuzden SADECE stop
  // emri icin 20sn'de bir /fapi/v1/algoOrder durumu sorgulanip TRIGGERED
  // olunca pozisyon kapatma akisi (onPositionClosed) tetikleniyor. TP1/TP2/
  // TP3/giris hala normal LIMIT emir oldugu icin onlar icin polling YOK,
  // ORDER_TRADE_UPDATE websocket'i yeterli (bkz. handleFill).
  @Interval(20000)
  async pollPendingStopOrders() {
    if (!this.binance.isConfigured) return;
    const trades = await this.prisma.autoTrade.findMany({
      where: { status: { in: ['OPEN', 'BREAKEVEN_SET'] }, slOrderId: { not: null } },
    });
    for (const trade of trades) {
      try {
        const algo = await this.binance.getAlgoOrderStatus(trade.symbol, trade.slOrderId!);
        if (algo.algoStatus === 'TRIGGERED') {
          await this.onPositionClosed(trade, 'STOP');
        }
      } catch (err: any) {
        this.logger.warn(`pollPendingStopOrders (${trade.symbol}): ${err.message}`);
      }
    }
  }

  // Guvenlik agi: TrackedSignal'in kendi mum-bazli takibi (scanner.service.ts
  // updateTrackedSignals, 1dk mum low/high'ina bakar) ile borsadaki GERCEK
  // LIMIT giris emri BAZEN uyusmuyor - fiyat zonu bir mum icinde kisa bir
  // fitille (wick) "dokunmus" gibi gorunup TrackedSignal'i TRIGGERED/HIT_TP*'e
  // ilerletebiliyor, ama o anki likidite bizim spesifik emrimizi doldurmaya
  // yetmemis olabilir (bkz. kullanici geri bildirimi 2026-08-20: ZECUSDT -
  // sinyal HIT_TP2'ye kadar ilerledi ama giris emri hic dolmadi, fiyat 564'ten
  // 593'e kacti). Boyle durumda gercek emir sonsuza kadar bekler ("kacan"
  // fiyat asla geri gelmez varsayimi makul degil, riskli). Kural: sinyal TP1
  // (veya sonrasi) seviyesine ulasmisken hala PENDING_ENTRY'deysek fırsat
  // kacmis demektir - bekleyen emri iptal et, kart listeden dussun (kullanici
  // istegi: "ilk tp fiyatına ulaşan bekleyen işlemi otomatik iptal et ve sil
  // gözükmesin bile").
  @Interval(60000)
  async pollStaleEntries() {
    if (!this.binance.isConfigured) return;
    const pending = await this.prisma.autoTrade.findMany({ where: { status: 'PENDING_ENTRY' } });
    for (const trade of pending) {
      const sig = await this.prisma.trackedSignal.findUnique({ where: { id: trade.trackedSignalId } });
      if (!sig) continue;
      if (['HIT_TP1', 'HIT_TP2', 'HIT_TP3'].includes(sig.status)) {
        this.logger.warn(`${trade.symbol}: TP1+ zaten vuruldu ama giris hic dolmadi - kacan firsat, bekleyen emir iptal ediliyor`);
        await this.notifyAdmins(
          'Orca ACS: Kaçan giriş iptal edildi',
          `${trade.symbol}: fiyat girmeden TP1 seviyesine ulaştı, giriş emri hiç dolmadı - fırsat kaçtı, bekleyen emir iptal edildi.`,
        );
        await this.onSignalInvalidated(trade.trackedSignalId);
      }
    }
  }

  // Money Maker sayfasinin en ustundeki BTC mum grafigi + acik/bekleyen her
  // pozisyonun BTC ile ne kadar birlikte hareket ettigi (korelasyon) icin
  // (kullanici istegi 2026-08-20: "btc grafiğinin altında sembol adı
  // korelasyon bilgisi yazsın sırayla, mum çubukları olsun"). Korelasyon HAM
  // FIYAT degil, bar-bar YUZDE DEGISIM (return) uzerinden Pearson katsayisi
  // ile hesaplanir - ham fiyat serisi kullanilsaydi iki coin de sadece ayni
  // gun icinde trend yönünde gittigi icin yapay derecede yuksek korelasyon
  // cikardi, return bazli hesap gercek "birlikte mi hareket ediyor" sorusuna
  // cevap verir.
  async getMarketContext(symbols: string[]) {
    const uniqueSymbols = Array.from(new Set(symbols)).filter((s) => s !== 'BTCUSDT');
    const [btcCandles, btcPrice, ...symbolCandles] = await Promise.all([
      this.binance.getRecentKlines('BTCUSDT', '1h', 24),
      this.binance.getTickerPrice('BTCUSDT'),
      ...uniqueSymbols.map((s) => this.binance.getRecentKlines(s, '1h', 24).catch(() => [])),
    ]);
    const btcCloses = btcCandles.map((c) => c.close);
    const correlations: Record<string, number | null> = {};
    uniqueSymbols.forEach((s, i) => {
      correlations[s] = pearsonReturnsCorrelation(btcCloses, symbolCandles[i].map((c) => c.close));
    });
    // Degisim yuzdesi de 24 saatlik mumun ilk acilisina gore anlik olarak
    // hesaplanir - CryptoMovers'daki changePercent gibi dakikalik cache'e
    // bagli degil.
    const btcChangePercent =
      btcPrice != null && btcCandles[0]?.open ? ((btcPrice - btcCandles[0].open) / btcCandles[0].open) * 100 : null;
    return { btcCandles, btcPrice, btcChangePercent, correlations };
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
  // TP2 dolmus olsa bile pozisyon acik sayildigi surece (PENDING_ENTRY/OPEN/
  // BREAKEVEN_SET) burada listelenir - PENDING_ENTRY icin henuz Binance'de
  // gercek bir pozisyon yok (limit emir dolmadi), o yuzden mark/notional/
  // liquidation null doner, kart bunu "bekliyor" olarak gosterir.
  async getLivePositions() {
    const openTrades = await this.prisma.autoTrade.findMany({
      where: { status: { in: ['PENDING_ENTRY', 'OPEN', 'BREAKEVEN_SET'] } },
      orderBy: { createdAt: 'desc' },
    });
    const results = await Promise.all(
      openTrades.map(async (trade) => {
        const [risk, pnlSoFar, sig, fundingRate] = await Promise.all([
          this.binance.getPositionRisk(trade.symbol).catch(() => null),
          trade.entryFilledAt
            ? this.binance.getRealizedPnlBreakdown(trade.symbol, trade.entryFilledAt.getTime(), Date.now()).catch(
                () => ({ realizedPnl: 0, commission: 0, funding: 0, netTotal: 0 }),
              )
            : Promise.resolve({ realizedPnl: 0, commission: 0, funding: 0, netTotal: 0 }),
          this.prisma.trackedSignal.findUnique({ where: { id: trade.trackedSignalId } }),
          this.binance.getFundingRate(trade.symbol).catch(() => null),
        ]);

        // PENDING_ENTRY'de SL/TP emirleri henuz acilmadi - kart, sinyaldeki
        // PLANLANAN seviyeleri gosterir. OPEN/BREAKEVEN_SET'te ise gercek
        // deger borsadaki bekleyen emirlerden okunur, cunku TP1 dolunca stop
        // basabasa cekiliyor (bkz. onTp1Filled) - DB'deki sinyal statik kalir,
        // gercek deger degisir. Bir TP orderId'si artik openOrders'ta yoksa
        // (doldu) o alan null doner, kart "doldu" gosterir.
        let stopPrice: number | null = sig?.stop ?? null;
        let tp1Price: number | null = sig?.tp1 ?? null;
        let tp2Price: number | null = sig?.tp2 ?? null;
        let tp3Price: number | null = sig?.tp3 ?? null;
        // pollPendingStopOrders 20sn'de bir kontrol ediyor - stop az once
        // tetiklenmis olabilir ama DB'deki status hala OPEN/BREAKEVEN_SET
        // gorunebilir (kapatma akisi henuz calismamis). Kart bu kisa pencerede
        // de "Stop oldu" notunu gosterebilsin diye canli algo durumu da
        // donduruluyor (kullanici istegi 2026-08-20).
        let stopTriggered = false;
        if (trade.status !== 'PENDING_ENTRY') {
          const [openOrders, algo] = await Promise.all([
            this.binance.getOpenOrders(trade.symbol).catch(() => [] as { orderId: number; price: number }[]),
            trade.slOrderId ? this.binance.getAlgoOrderStatus(trade.symbol, trade.slOrderId).catch(() => null) : Promise.resolve(null),
          ]);
          const findPrice = (orderId: string | null) =>
            orderId ? openOrders.find((o) => String(o.orderId) === orderId)?.price ?? null : null;
          tp1Price = findPrice(trade.tp1OrderId);
          tp2Price = findPrice(trade.tp2OrderId);
          tp3Price = findPrice(trade.tp3OrderId);
          stopPrice = algo ? parseFloat(algo.triggerPrice) : stopPrice;
          stopTriggered = algo?.algoStatus === 'TRIGGERED';
        }

        return {
          id: trade.id,
          symbol: trade.symbol,
          direction: trade.direction,
          status: trade.status,
          // PENDING_ENTRY'de trade.entryPrice henuz null (emir dolmadi) -
          // kart "Giriş: —" gibi bos gorunmesin diye LIMIT emrin hedefledigi
          // planlanan fiyata (onSignalCreated'daki ayni hesap: bullish ise
          // entryZoneTop, degilse entryZoneBottom) duser (kullanici istegi
          // 2026-08-20: "giriş fiyatı bekleniyor derken yazmıyor yazsın").
          entryPrice:
            trade.entryPrice ?? (sig ? (trade.direction === 'LONG' ? sig.entryZoneTop : sig.entryZoneBottom) : null),
          qty: trade.qty,
          markPrice: risk?.markPrice ?? null,
          unrealizedProfit: risk?.unrealizedProfit ?? null,
          notional: risk?.notional ?? null,
          leverage: risk?.leverage ?? null,
          liquidationPrice: risk?.liquidationPrice ?? null,
          fundingRate,
          stopPrice,
          stopTriggered,
          tp1Price,
          tp2Price,
          tp3Price,
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

    const limitOrderIds = [trade.tp1OrderId, trade.tp2OrderId, trade.tp3OrderId].filter(
      (id): id is string => !!id,
    );
    await Promise.all([
      ...limitOrderIds.map((id) => this.binance.cancelOrder(trade.symbol, id)),
      trade.slOrderId ? this.binance.cancelAlgoOrder(trade.symbol, trade.slOrderId) : Promise.resolve(),
    ]);

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
      const limitOrderIds = [trade.entryOrderId, trade.tp1OrderId, trade.tp2OrderId, trade.tp3OrderId].filter(
        (id): id is string => !!id,
      );
      for (const id of limitOrderIds) {
        await this.binance.cancelOrder(trade.symbol, id);
      }
      if (trade.slOrderId) await this.binance.cancelAlgoOrder(trade.symbol, trade.slOrderId);
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
