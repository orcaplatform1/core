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
// enabled=false) - kullanici hazir oldugunda admin endpoint'ten acacak. Bu iki
// bagimsiz anahtar (enabled + cryptoEnabled) + .env'de gercek API key sarti
// olmadan HICBIR gercek emir gitmez (bkz. isActive()). Borsa baglantisi daima
// mainnet (2026-08-25: testnet destegi komple kaldirildi).
//
// Akis: onSignalCreated -> LIMIT giris emri (borsa doldurur) -> ORDER_TRADE_UPDATE
// (websocket, anlik) -> SL+TP1+TP2+TP3 emirleri acilir -> TP1 dolunca stop
// otomatik basabasa cekilir -> TP2/TP3/SL dolunca pozisyon kapanir. Fiyat
// pollamiyoruz - hepsi borsanin kendi fill bildirimiyle tetikleniyor.
@Injectable()
export class AutoTradeService implements OnModuleInit {
  private readonly logger = new Logger(AutoTradeService.name);

  // Money Maker disinda (dogrudan Binance'ten) elle acilmis pozisyonlar DB'de
  // hic kayitli degil - kapandiklarinda TP mi stop mu vurdugunu anlayabilmek
  // icin son gorulen durumlarini (stop/TP emir id'leri, giris fiyati vb.)
  // bellekte tutuyoruz (kullanici istegi 2026-08-25: "islem orda kapanıncada
  // burda tp se tp stopda stop diye etiket koyarsın"). Restart'ta sifirlanir -
  // DB'ye yazilmiyor, bilerek hafif tutuldu.
  private readonly manualPositionState = new Map<
    string,
    {
      direction: 'LONG' | 'SHORT';
      qty: number;
      entryPrice: number;
      sinceMs: number;
      // 2025-12-09'dan sonra Binance STOP_MARKET/TAKE_PROFIT_MARKET emirlerini
      // ayri bir "Algo Order" servisine tasidi (bkz. BinanceFuturesClientService
      // getOpenAlgoOrders yorumu) - o yuzden bir emrin normal (/fapi/v1/order)
      // mi yoksa algo (/fapi/v1/algoOrder) mi oldugunu ayrica tutuyoruz, kapanis
      // sebebini kontrol ederken dogru endpoint'e sorulabilsin diye.
      stop: { kind: 'algo' | 'order'; id: number } | null;
      tp1: { kind: 'algo' | 'order'; id: number } | null;
      tp2: { kind: 'algo' | 'order'; id: number } | null;
      tp3: { kind: 'algo' | 'order'; id: number } | null;
    }
  >();
  private manualClosedHistory: Array<{
    id: string;
    symbol: string;
    direction: 'LONG' | 'SHORT';
    closeReason: 'TP3' | 'STOP_FULL_LOSS' | 'MANUAL_CLOSE';
    entryPrice: number;
    qty: number;
    closedAtMs: number;
    realizedPnl: number;
    commission: number;
    funding: number;
    netPnl: number;
  }> = [];

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

      // Guvenlik agi: ayni sembol icin zaten aktif (PENDING_ENTRY/OPEN/
      // BREAKEVEN_SET) bir AutoTrade varsa ikinci bir gercek Binance emri
      // ACMA. TrackedSignal tarafindaki blokSymbols kontrolu (scanner.service.ts)
      // yaziyla-okuma arasinda yarisa acik (iki concurrent scan job'i ayni
      // sembolu bos gorup ikisi de sinyal uretebiliyordu) - burasi son
      // savunma hatti, hangi yoldan gelirse gelsin ayni sembolde iki gercek
      // pozisyon acilmasini engeller (bkz. kullanici geri bildirimi
      // 2026-08-23: OPUSDT'de 2dk arayla iki ayri trade acilip biri
      // digerinin korumali pozisyonunu piyasadan kapatmisti).
      const existingActiveTrade = await this.prisma.autoTrade.findFirst({
        where: { symbol: sig.symbol, status: { in: ['PENDING_ENTRY', 'OPEN', 'BREAKEVEN_SET'] } },
      });
      if (existingActiveTrade) {
        this.logger.warn(`${sig.symbol}: zaten aktif bir AutoTrade var (id=${existingActiveTrade.id}, status=${existingActiveTrade.status}) - yeni sinyal icin emir acilmadi (duplicate guard)`);
        return;
      }

      const bullish = sig.direction === 'LONG';
      const entryPrice = bullish ? sig.entryZoneTop : sig.entryZoneBottom;
      const riskDistance = Math.abs(entryPrice - sig.stop);
      if (riskDistance <= 0) return;

      // Guvenlik agi: sinyal, kirilim mumunun kapanisindan hesaplaniyor - o
      // andan emrin acilmasina kadar gecen surede (tarama dongusu + agirlik)
      // fiyat setup'i zaten gecersiz kilmis olabilir (stop seviyesini kirmis
      // olabilir). Bu kontrol olmadan entryZoneTop/Bottom'a konan LIMIT emri,
      // guncel fiyat zaten bu seviyenin OTESINDEYSE (bullish icin stop'un
      // altindaysa) Binance tarafindan aninda (piyasa emri gibi) doldurulur -
      // yani zaten cokmus bir yapiya, canli fiyat kontrolu olmadan giriliyor
      // olurdu (bkz. kullanici geri bildirimi 2026-08-21: Money Maker'da
      // kacan islem analizi). Fiyat cekilemezse (agdaki hata) eski davranisa
      // (kontrolsuz devam) dusuluyor - bu guvenlik agi olmadan da onceki
      // durumdan daha kotu olmaz.
      const livePriceCheck = await this.binance.getTickerPrice(sig.symbol).catch(() => null);
      if (livePriceCheck != null) {
        const alreadyInvalidated = bullish ? livePriceCheck <= sig.stop : livePriceCheck >= sig.stop;
        if (alreadyInvalidated) {
          this.logger.warn(
            `${sig.symbol}: canli fiyat (${livePriceCheck}) zaten stop seviyesini (${sig.stop}) gecmis, giris emri acilmadan atlandi (setup gecersiz)`,
          );
          await this.notifyAdmins(
            'Orca ACS: Geçersiz setup - emir açılmadı',
            `${sig.symbol}: sinyal oluşturulduğu andan emir açılana kadar geçen sürede fiyat (${livePriceCheck}) zaten stop seviyesini (${sig.stop}) geçmiş, giriş emri hiç açılmadı.`,
          );
          return;
        }
      }

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
      //
      // getPositionAmt sembol BAZINDA (Binance one-way modda tek net pozisyon)
      // deger dondurur, bu trade'e ozel degil. Ayni sembolde baska bir AKTIF
      // trade varken (orn. neredeyse ayni anda acilan iki ayni-sembol sinyali)
      // bu kontrol o DIGER trade'in zaten SL/TP ile KORUNAN pozisyonunu da
      // gorup piyasadan kapatabiliyordu - ve o trade'in DB kaydi hic
      // guncellenmiyordu (bkz. kullanici geri bildirimi 2026-08-23: OPUSDT
      // stopun altina dustu ama pozisyon "acik" gorunmeye devam etti - kok
      // sebep buydu). Baska aktif trade varsa piyasa kapatmasini atla, sadece
      // uyar - o trade'in kendi SL/TP zinciri zaten calisiyor olmali.
      const otherActiveTrade = await this.prisma.autoTrade.findFirst({
        where: {
          symbol: trade.symbol,
          id: { not: trade.id },
          status: { in: ['PENDING_ENTRY', 'OPEN', 'BREAKEVEN_SET'] },
        },
      });
      if (otherActiveTrade) {
        await this.prisma.autoTrade.update({ where: { id: trade.id }, data: { status: 'EXPIRED' } });
        await this.notifyAdmins(
          'Orca ACS: Kısmi dolan emir güvenlik ağı atlandı',
          `${trade.symbol}: setup geçersizleşti ama aynı sembolde başka aktif bir trade (${otherActiveTrade.id}) var - piyasa kapatma güvenlik ağı çakışmayı önlemek için atlandı, bu diğer trade'in kendi SL/TP zinciri korumada.`,
        );
        return;
      }

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
  // emri icin 20sn'de bir /fapi/v1/algoOrder durumu sorgulanip tetiklenince
  // pozisyon kapatma akisi (onPositionClosed) tetikleniyor. TP1/TP2/TP3/giris
  // hala normal LIMIT emir oldugu icin onlar icin polling YOK, ORDER_TRADE_UPDATE
  // websocket'i yeterli (bkz. handleFill).
  //
  // algoStatus degeri 'TRIGGERED' DEGIL 'FINISHED' oluyor (bkz. kullanici
  // geri bildirimi 2026-08-21: APTUSDT basabas stopa carpmis, algo GERCEKTEN
  // tetiklenmis - triggerTime dolu, actualOrderId dolu - ama status kontrolu
  // 'TRIGGERED' bekledigi icin hicbir zaman eslesmedi, AutoTrade sonsuza kadar
  // BREAKEVEN_SET'te takili kaldi, panel "TP2 alindi" gibi yanlis/eski bir not
  // gostermeye devam etti). Guvenilir sinyal algoStatus'un TAM ESLESMESI degil,
  // actualOrderId'nin dolu olmasi - bu alan SADECE kosul gerceklesip GERCEK bir
  // emir olusunca doluyor, Binance'in kullandigi terminal durum string'inden
  // (TRIGGERED/FINISHED/vs.) bagimsiz.
  @Interval(20000)
  async pollPendingStopOrders() {
    if (!this.binance.isConfigured) return;
    const trades = await this.prisma.autoTrade.findMany({
      where: { status: { in: ['OPEN', 'BREAKEVEN_SET'] }, slOrderId: { not: null } },
    });
    for (const trade of trades) {
      try {
        const algo = await this.binance.getAlgoOrderStatus(trade.symbol, trade.slOrderId!);
        const hasTriggered = !!algo.actualOrderId && algo.actualOrderId !== '0';
        if (hasTriggered) {
          await this.onPositionClosed(trade, 'STOP');
          continue;
        }

        // algoStatus REJECTED ("Reduce only reject") = borsada bu sembol icin
        // artik kapatilacak pozisyon yok (baska bir yolla - orn. onSignalInvalidated
        // guvenlik agi - zaten kapanmis), ama actualOrderId bos kaldigi icin
        // yukaridaki hasTriggered kontrolu hicbir zaman true olmuyordu ve kayit
        // sonsuza kadar OPEN/BREAKEVEN_SET'te takili kaliyordu (bkz. kullanici
        // geri bildirimi 2026-08-23: OPUSDT fiyat stopun altinda ama pozisyon
        // hala "acik" gorunuyordu). Gercek pozisyonu dogrudan sorgulayip, borsada
        // gercekten pozisyon kalmamissa DB'yi kapali olarak isaretle.
        if (algo.algoStatus === 'REJECTED') {
          const positionAmt = await this.binance.getPositionAmt(trade.symbol);
          if (Math.abs(positionAmt) === 0) {
            this.logger.warn(`${trade.symbol}: stop emri REJECTED ama pozisyon zaten yok - kayit kapatiliyor (onPositionClosed)`);
            await this.onPositionClosed(trade, 'STOP');
          } else {
            this.logger.error(`${trade.symbol}: stop emri REJECTED VE pozisyon hala acik (${positionAmt}) - KORUMASIZ, elle kontrol gerekiyor`);
            await this.notifyAdmins(
              'Orca ACS: KRİTİK - stop emri reddedildi, pozisyon korumasız',
              `${trade.symbol}: stop-loss emri Binance tarafından reddedildi ("Reduce only reject") ve pozisyon (${positionAmt}) hâlâ açık. Elle kontrol et.`,
            );
          }
        }
      } catch (err: any) {
        this.logger.warn(`pollPendingStopOrders (${trade.symbol}): ${err.message}`);
      }
    }
  }

  // Guvenlik agi: gercek LIMIT giris emri fiyati hic gormeden fırsat kacabilir
  // (fiyat entry bolgesine hic donmeden TP1'i gecip gidebilir - bkz. kullanici
  // geri bildirimi 2026-08-20: ZECUSDT, sonra TAOUSDT/XRPUSDT). Ilk versiyon
  // bunu TrackedSignal.status (HIT_TP1+) uzerinden kontrol ediyordu, ama o
  // sadece scanner'in 15dk'lik cron dongusunde guncelleniyor - fiyat TP1'i
  // gectikten SONRAKI ilk cron'a kadar (en fazla ~15dk) emir gereksiz yere
  // acik kaliyordu (kullanici geri bildirimi: "TAO'da mark fiyatı TP1'i
  // geçti iptal edilmedi"). Artik dogrudan CANLI fiyati TP1 ile kiyaslıyor -
  // scanner cron'unu beklemeden, en fazla 60sn icinde iptal ediyor.
  @Interval(60000)
  async pollStaleEntries() {
    if (!this.binance.isConfigured) return;
    let pending: Awaited<ReturnType<typeof this.prisma.autoTrade.findMany>>;
    try {
      pending = await this.prisma.autoTrade.findMany({ where: { status: 'PENDING_ENTRY' } });
    } catch (err: any) {
      // DB'nin kisa sureli restart'lari (bkz. unattended-upgrades) sirasinda bu sorgu
      // basarisiz olabiliyordu ve try/catch olmadan unhandled rejection olarak process'i
      // etkileme riski tasiyordu - bir sonraki 60sn'lik tick'te zaten tekrar denenecek.
      this.logger.warn(`pollStaleEntries (findMany): ${err.message}`);
      return;
    }
    for (const trade of pending) {
      try {
        const sig = await this.prisma.trackedSignal.findUnique({ where: { id: trade.trackedSignalId } });
        if (!sig) continue;
        const price = await this.binance.getTickerPrice(trade.symbol).catch(() => null);
        if (price == null) continue;
        const passedTp1 = trade.direction === 'LONG' ? price >= sig.tp1 : price <= sig.tp1;
        if (passedTp1) {
          this.logger.warn(`${trade.symbol}: fiyat (${price}) TP1'e (${sig.tp1}) ulasti ama giris hic dolmadi - kacan firsat, bekleyen emir iptal ediliyor`);
          await this.notifyAdmins(
            'Orca ACS: Kaçan giriş iptal edildi',
            `${trade.symbol}: fiyat (${price}) girmeden TP1 seviyesine (${sig.tp1}) ulaştı, giriş emri hiç dolmadı - fırsat kaçtı, bekleyen emir iptal edildi.`,
          );
          await this.onSignalInvalidated(trade.trackedSignalId);
        }
      } catch (err: any) {
        this.logger.warn(`pollStaleEntries (${trade.symbol}): ${err.message}`);
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
    const [activeTrades, recentClosed] = await Promise.all([
      this.prisma.autoTrade.findMany({
        where: { status: { in: ['PENDING_ENTRY', 'OPEN', 'BREAKEVEN_SET'] } },
        orderBy: { createdAt: 'desc' },
      }),
      // Kapanan islemler de kartta kalsin diye (kullanici istegi 2026-08-20:
      // "tp ile kapananlar yeşil, stop olanlar kırmızı kenar - en altta
      // olsun") - sinirsiz gecmis yerine son 48 saat + en fazla 15 kayit,
      // panel sonsuza kadar buyumesin.
      this.prisma.autoTrade.findMany({
        where: { status: 'CLOSED', createdAt: { gt: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);
    const openTrades = [...activeTrades, ...recentClosed];
    // Siralama: bekleyen (PENDING_ENTRY, turuncu) en ustte, acik pozisyonlar
    // (OPEN/BREAKEVEN_SET, mavi) altinda, TP ile kapananlar (yesil) onun
    // altinda, stop ile kapananlar (kirmizi) en altta - karisik siralaninca
    // panel dagınık gorunuyordu (kullanici geri bildirimi 2026-08-20:
    // "ortalık karışıyor"). Her grubun kendi icinde en yeni en ustte.
    const rank = (t: (typeof openTrades)[number]) => {
      if (t.status === 'PENDING_ENTRY') return 0;
      if (t.status === 'OPEN' || t.status === 'BREAKEVEN_SET') return 1;
      if (t.status === 'CLOSED' && t.closeReason === 'TP3') return 2;
      if (t.status === 'CLOSED' && (t.closeReason === 'STOP_BREAKEVEN' || t.closeReason === 'STOP_FULL_LOSS')) return 3;
      return 4;
    };
    openTrades.sort((a, b) => {
      const diff = rank(a) - rank(b);
      return diff !== 0 ? diff : b.createdAt.getTime() - a.createdAt.getTime();
    });
    const results = await Promise.all(
      openTrades.map(async (trade) => {
        const isActive = trade.status !== 'CLOSED';

        if (!isActive) {
          // Kapanmis islem icin canli borsa sorgusu gerekmiyor - emirler
          // zaten iptal/dolmus, sonuc AutoTrade uzerinde kayitli (bkz.
          // onPositionClosed).
          return {
            id: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            status: trade.status,
            closeReason: trade.closeReason,
            entryPrice: trade.entryPrice,
            qty: trade.qty,
            markPrice: null,
            unrealizedProfit: null,
            notional: null,
            leverage: null,
            liquidationPrice: null,
            fundingRate: null,
            stopPrice: null,
            stopTriggered: false,
            tp1Price: null,
            tp2Price: null,
            tp3Price: null,
            tp1Filled: false,
            tp2Filled: false,
            tp3Filled: false,
            realizedSoFar: trade.realizedPnl ?? 0,
            commissionSoFar: trade.commission ?? 0,
            fundingSoFar: trade.funding ?? 0,
          };
        }

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

        // TP1/TP2/TP3 fiyatlari HICBIR ZAMAN degismez (sadece STOP, TP1
        // dolunca basabasa cekilir) - o yuzden sinyaldeki sabit deger her
        // zaman dogru, "doldu mu" ayri bir bayrakla takip edilir. Onceden
        // dolan TP'nin fiyati null donduruluyordu, bu da kart dolunca %/R
        // bilgisini kaybediyordu (kullanici geri bildirimi 2026-08-20: "tp1
        // tp2 doldu diyor ya rr ve yüzdeliği silme").
        const tp1Price: number | null = sig?.tp1 ?? null;
        const tp2Price: number | null = sig?.tp2 ?? null;
        const tp3Price: number | null = sig?.tp3 ?? null;
        let stopPrice: number | null = sig?.stop ?? null;
        let tp1Filled = false;
        let tp2Filled = false;
        let tp3Filled = false;
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
          const isResting = (orderId: string | null) =>
            !!orderId && openOrders.some((o) => String(o.orderId) === orderId);
          // "Listede yok" = doldu DEGIL - CANCELED/EXPIRED/REJECTED de
          // listeden duser (bkz. kullanici geri bildirimi 2026-08-21:
          // basabas stop TP2/TP3'ten once tetiklenince artik karsiligi
          // olmayan TP2/TP3 emirleri Binance tarafindan EXPIRED yapildi,
          // panel bunlari da "alindi" gosterdi). Listede olmayan her TP icin
          // gercek durumu tek tek sorgula - status FILLED ise gercekten
          // doldu, degilse (EXPIRED/CANCELED) hic dolmadi.
          const resolveFilled = async (orderId: string | null): Promise<boolean> => {
            if (!orderId) return false;
            if (isResting(orderId)) return false;
            const status = await this.binance.getOrderStatus(trade.symbol, orderId).catch(() => null);
            return status?.status === 'FILLED';
          };
          [tp1Filled, tp2Filled, tp3Filled] = await Promise.all([
            resolveFilled(trade.tp1OrderId),
            resolveFilled(trade.tp2OrderId),
            resolveFilled(trade.tp3OrderId),
          ]);
          stopPrice = algo ? parseFloat(algo.triggerPrice) : stopPrice;
          stopTriggered = !!algo?.actualOrderId && algo.actualOrderId !== '0';
        }

        return {
          id: trade.id,
          symbol: trade.symbol,
          direction: trade.direction,
          status: trade.status,
          closeReason: trade.closeReason,
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
          tp1Filled,
          tp2Filled,
          tp3Filled,
          // Simdiye kadar (TP1/TP2 kismi kapanislarindan) bankaya yatmis kar +
          // o ana kadar tahakkuk etmis komisyon/funding - hala acik olan
          // dilimin unrealizedProfit'i BUNA DAHIL DEGIL, ayri gosteriliyor.
          realizedSoFar: pnlSoFar.realizedPnl,
          commissionSoFar: pnlSoFar.commission,
          fundingSoFar: pnlSoFar.funding,
        };
      }),
    );

    // Money Maker disinda (dogrudan Binance'ten) elle acilmis pozisyonlar -
    // yukaridaki DB'de hic AutoTrade kaydi yok, o yuzden bot tarafindan
    // acilmis gibi ayri kartlar olarak ekleniyor (kullanici istegi
    // 2026-08-25). Sadece gercekten AKTIF (OPEN/BREAKEVEN_SET) DB kayitlarinin
    // sembolu haric tutulur - PENDING_ENTRY'de borsada henuz gercek pozisyon
    // yok, cakisma olmaz.
    const trackedSymbols = new Set(
      activeTrades.filter((t) => t.status === 'OPEN' || t.status === 'BREAKEVEN_SET').map((t) => t.symbol),
    );
    const manualPositions = await this.binance
      .getAllOpenPositions()
      .catch(() => [] as Awaited<ReturnType<BinanceFuturesClientService['getAllOpenPositions']>>);
    const untrackedManual = manualPositions.filter((p) => !trackedSymbols.has(p.symbol));

    const manualResults = await Promise.all(
      untrackedManual.map(async (p) => {
        const direction: 'LONG' | 'SHORT' = p.positionAmt > 0 ? 'LONG' : 'SHORT';
        // STOP_MARKET/TAKE_PROFIT_MARKET (Binance UI'nin "TP/SL" kisayolunun
        // koydugu tip) 2025-12-09'dan beri normal /fapi/v1/openOrders'ta
        // GORUNMUYOR, ayri "Algo Order" listesinden gelmesi lazim - bkz.
        // BinanceFuturesClientService.getOpenAlgoOrders yorumu (kullanici
        // geri bildirimi 2026-08-25: tek stop/tek TP koydu, panel "bulunamadı"
        // dedi - kok sebep buydu). Duz LIMIT reduceOnly emirler (manuel TP
        // icin de kullanilabilir) hala normal openOrders'ta kaliyor, o yuzden
        // ikisi birlikte sorgulanip birlestiriliyor.
        const [orders, algoOrders] = await Promise.all([
          this.binance.getOpenOrders(p.symbol).catch(() => []),
          this.binance.getOpenAlgoOrders(p.symbol).catch(() => []),
        ]);
        const algoStop = algoOrders.find((o) => o.orderType === 'STOP_MARKET' || o.orderType === 'STOP') ?? null;
        const regularStop = !algoStop ? orders.find((o) => o.type === 'STOP_MARKET' || o.type === 'STOP') ?? null : null;
        const stopRef: { kind: 'algo' | 'order'; id: number; price: number } | null = algoStop
          ? { kind: 'algo', id: algoStop.algoId, price: algoStop.triggerPrice }
          : regularStop
            ? { kind: 'order', id: regularStop.orderId, price: regularStop.stopPrice }
            : null;

        const tpCandidates = [
          ...algoOrders
            .filter((o) => o !== algoStop && (o.orderType === 'TAKE_PROFIT_MARKET' || o.orderType === 'TAKE_PROFIT'))
            .map((o) => ({ kind: 'algo' as const, id: o.algoId, price: o.triggerPrice })),
          ...orders
            .filter((o) => o !== regularStop && (o.type === 'TAKE_PROFIT_MARKET' || o.type === 'TAKE_PROFIT' || (o.type === 'LIMIT' && o.reduceOnly)))
            .map((o) => ({ kind: 'order' as const, id: o.orderId, price: o.type === 'LIMIT' ? o.price : o.stopPrice })),
        ].sort((a, b) => Math.abs(a.price - p.entryPrice) - Math.abs(b.price - p.entryPrice));
        const [tp1, tp2, tp3] = tpCandidates;

        // Bir sonraki poll'da bu pozisyon Binance'ten kaybolursa (kapandiysa)
        // TP mi stop mu vurdugunu anlayabilmek icin son gorulen emir
        // referanslarini (hangi endpoint'ten geldigi + id) bellekte
        // guncelliyoruz.
        this.manualPositionState.set(p.symbol, {
          direction,
          qty: Math.abs(p.positionAmt),
          entryPrice: p.entryPrice,
          sinceMs: this.manualPositionState.get(p.symbol)?.sinceMs ?? Date.now(),
          stop: stopRef ? { kind: stopRef.kind, id: stopRef.id } : null,
          tp1: tp1 ? { kind: tp1.kind, id: tp1.id } : null,
          tp2: tp2 ? { kind: tp2.kind, id: tp2.id } : null,
          tp3: tp3 ? { kind: tp3.kind, id: tp3.id } : null,
        });

        return {
          id: `manual:${p.symbol}`,
          symbol: p.symbol,
          direction,
          status: 'OPEN' as const,
          closeReason: null,
          entryPrice: p.entryPrice,
          qty: Math.abs(p.positionAmt),
          markPrice: p.markPrice,
          unrealizedProfit: p.unrealizedProfit,
          notional: p.notional,
          leverage: p.leverage,
          liquidationPrice: p.liquidationPrice,
          fundingRate: await this.binance.getFundingRate(p.symbol).catch(() => null),
          stopPrice: stopRef?.price ?? null,
          stopTriggered: false,
          tp1Price: tp1?.price ?? null,
          tp2Price: tp2?.price ?? null,
          tp3Price: tp3?.price ?? null,
          tp1Filled: false,
          tp2Filled: false,
          tp3Filled: false,
          realizedSoFar: 0,
          commissionSoFar: 0,
          fundingSoFar: 0,
          manual: true,
        };
      }),
    );

    // Az once bellekte kayitli olup artik Binance'te (ve bot tarafinda) hic
    // gorulmeyen semboller = kapanmis demek - hangi emrin (stop/TP) doldugunu
    // kontrol edip "TP3"/"STOP_FULL_LOSS"/"MANUAL_CLOSE" olarak etiketliyoruz
    // (kullanici istegi 2026-08-25: "işlem orda kapanıncada burda tp se tp
    // stopda stop diye etiket koyarsın").
    const stillOpenSymbols = new Set(untrackedManual.map((p) => p.symbol));
    const disappeared = [...this.manualPositionState.entries()].filter(
      ([symbol]) => !stillOpenSymbols.has(symbol) && !trackedSymbols.has(symbol),
    );
    // Bir emir referansinin (stop veya TP) GERCEKTEN tetiklenip tetiklenmedigini
    // kontrol eder - referans algo ise /fapi/v1/algoOrder (actualOrderId doluysa
    // tetiklenmis, bkz. bot'un kendi stop'u icin ayni desen yukarida), normal
    // emirse /fapi/v1/order (status FILLED).
    const wasFilled = async (symbol: string, ref: { kind: 'algo' | 'order'; id: number } | null): Promise<boolean> => {
      if (!ref) return false;
      if (ref.kind === 'algo') {
        const s = await this.binance.getAlgoOrderStatus(symbol, ref.id).catch(() => null);
        return !!s?.actualOrderId && s.actualOrderId !== '0' && s.actualOrderId !== '';
      }
      const s = await this.binance.getOrderStatus(symbol, ref.id).catch(() => null);
      return s?.status === 'FILLED';
    };

    for (const [symbol, state] of disappeared) {
      this.manualPositionState.delete(symbol);
      let closeReason: 'TP3' | 'STOP_FULL_LOSS' | 'MANUAL_CLOSE' = 'MANUAL_CLOSE';
      if (await wasFilled(symbol, state.stop)) {
        closeReason = 'STOP_FULL_LOSS';
      } else {
        for (const tp of [state.tp1, state.tp2, state.tp3]) {
          if (await wasFilled(symbol, tp)) {
            closeReason = 'TP3';
            break;
          }
        }
      }
      const pnl = await this.binance
        .getRealizedPnlBreakdown(symbol, state.sinceMs, Date.now())
        .catch(() => ({ realizedPnl: 0, commission: 0, funding: 0, netTotal: 0 }));
      this.manualClosedHistory.unshift({
        id: `manual-closed:${symbol}:${Date.now()}`,
        symbol,
        direction: state.direction,
        closeReason,
        entryPrice: state.entryPrice,
        qty: state.qty,
        closedAtMs: Date.now(),
        realizedPnl: pnl.realizedPnl,
        commission: pnl.commission,
        funding: pnl.funding,
        netPnl: pnl.netTotal,
      });
      await this.notifyAdmins(
        'Orca ACS: Elle açılan pozisyon kapandı',
        `${symbol}: ${closeReason === 'TP3' ? 'TP' : closeReason === 'STOP_FULL_LOSS' ? 'Stop' : 'Elle'} ile kapandı - net ${pnl.netTotal >= 0 ? '+' : ''}$${pnl.netTotal.toFixed(2)}.`,
      );
    }
    // 48 saatten eski kayitlar dusurulur, en fazla 15 kayit tutulur - bot'un
    // kendi CLOSED gecmisiyle ayni pencere/limit (bkz. bu fonksiyonun basi).
    this.manualClosedHistory = this.manualClosedHistory
      .filter((c) => c.closedAtMs > Date.now() - 48 * 60 * 60 * 1000)
      .slice(0, 15);

    const manualClosedResults = this.manualClosedHistory.map((c) => ({
      id: c.id,
      symbol: c.symbol,
      direction: c.direction,
      status: 'CLOSED' as const,
      closeReason: c.closeReason,
      entryPrice: c.entryPrice,
      qty: c.qty,
      markPrice: null,
      unrealizedProfit: null,
      notional: null,
      leverage: null,
      liquidationPrice: null,
      fundingRate: null,
      stopPrice: null,
      stopTriggered: false,
      tp1Price: null,
      tp2Price: null,
      tp3Price: null,
      tp1Filled: false,
      tp2Filled: false,
      tp3Filled: false,
      realizedSoFar: c.realizedPnl,
      commissionSoFar: c.commission,
      fundingSoFar: c.funding,
      manual: true,
    }));

    return [...manualResults, ...results, ...manualClosedResults];
  }

  // "manual:<symbol>" id'li kartlar icin - DB'de hic kaydi olmayan, dogrudan
  // Binance'ten elle acilmis bir pozisyonu panelden piyasa fiyatiyla kapatir.
  async closeManualPosition(symbol: string) {
    const positionAmt = await this.binance.getPositionAmt(symbol).catch(() => 0);
    if (Math.abs(positionAmt) === 0) return;

    // Elle konulmus stop/TP'ler (algo + normal) kalirsa panelden kapatilmis
    // pozisyonun "hangisi vurdu" tespiti bir sonraki pollde yanlis MANUAL_CLOSE
    // yerine hayalet bir TP/stop'a baglanabilir - piyasadan kapatmadan once
    // hepsi iptal edilir.
    const [orders, algoOrders] = await Promise.all([
      this.binance.getOpenOrders(symbol).catch(() => []),
      this.binance.getOpenAlgoOrders(symbol).catch(() => []),
    ]);
    await Promise.all([
      ...orders.filter((o) => o.reduceOnly).map((o) => this.binance.cancelOrder(symbol, o.orderId)),
      ...algoOrders.map((o) => this.binance.cancelAlgoOrder(symbol, o.algoId)),
    ]);

    await this.binance.placeOrder({
      symbol,
      side: positionAmt > 0 ? 'SELL' : 'BUY',
      type: 'MARKET',
      quantity: Math.abs(positionAmt),
      reduceOnly: true,
    });
    await this.notifyAdmins(
      'Orca ACS: Manuel pozisyon panelden kapatıldı',
      `${symbol}: Binance'te elle açılmış pozisyon panelden piyasa fiyatından kapatıldı.`,
    );
  }

  // Tek bir pozisyonu ELLE kapatir (kullanici panelden "Kapat" butonuna
  // basinca) - kalan tum emirleri iptal eder, borsada hala acik pozisyon
  // varsa piyasa fiyatindan kapatir, gercek PnL'i kaydeder.
  async closePosition(tradeId: string) {
    if (tradeId.startsWith('manual:')) {
      await this.closeManualPosition(tradeId.slice('manual:'.length));
      return;
    }
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

    // Elle acilmis (DB'de hic kaydi olmayan) pozisyonlar da "Tüm İşlemleri
    // Kapat" ile birlikte kapatilsin (kullanici istegi 2026-08-25).
    const trackedSymbols = new Set(
      openTrades.filter((t) => t.status === 'OPEN' || t.status === 'BREAKEVEN_SET').map((t) => t.symbol),
    );
    const manualPositions = await this.binance.getAllOpenPositions().catch(() => []);
    let manualClosed = 0;
    for (const p of manualPositions.filter((p) => !trackedSymbols.has(p.symbol))) {
      await this.closeManualPosition(p.symbol)
        .then(() => manualClosed++)
        .catch((err) => this.logger.error(`closeAllPositions: manuel ${p.symbol} kapatilamadi: ${err.message}`));
    }

    return { closed: openTrades.length + manualClosed };
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
