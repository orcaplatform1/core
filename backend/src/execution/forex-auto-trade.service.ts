import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// scanner.service.ts'in YAHOO_MAP'i ile BIREBIR ayni olmali (sembol -> Yahoo
// ticker). Ayrica bir bagimlilik dongusu olusturmamak icin (ScannerService
// zaten AutoTradeService/ForexAutoTradeService'e bagimli) burada bagimsiz bir
// kopya tutuluyor - tek kaynaktan import scanner.module.ts <-> execution.module.ts
// arasinda dairesel modul bagimliligi yaratirdi.
const YAHOO_MAP: Record<string, string> = {
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X', USDCHF: 'USDCHF=X',
  AUDUSD: 'AUDUSD=X', USDCAD: 'USDCAD=X', NZDUSD: 'NZDUSD=X', EURGBP: 'EURGBP=X',
  EURJPY: 'EURJPY=X', GBPJPY: 'GBPJPY=X', EURCHF: 'EURCHF=X', AUDJPY: 'AUDJPY=X',
  CADJPY: 'CADJPY=X', XAUUSD: 'GC=F', XAGUSD: 'SI=F', BRENT: 'BZ=F', WTI: 'CL=F',
  USDCNH: 'USDCNH=X', USDZAR: 'USDZAR=X', USDMXN: 'USDMXN=X',
};

// ICE US Dolar Endeksi - kripto tarafindaki BTC korelasyon kartinin forex
// karsiligi icin referans varlik (kullanici istegi 2026-08-22: "dxy koy xbt
// gibi"). Taranan sembol evreninde (YAHOO_MAP) DEGIL - sadece bu kart icin.
const DXY_YAHOO_SYMBOL = 'DX-Y.NYB';

type Candle = { time: number; open: number; high: number; low: number; close: number };

async function fetchYahoo(yahooSymbol: string, range: string, interval: string): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${interval}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];
    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    return timestamps
      .map((t, i) => ({
        time: t * 1000, open: quote.open?.[i], high: quote.high?.[i],
        low: quote.low?.[i], close: quote.close?.[i],
      }))
      .filter((c) => c.close != null);
  } catch {
    return [];
  }
}

// bkz. auto-trade.service.ts pearsonReturnsCorrelation - birebir ayni (DXY
// korelasyon karti icin).
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

// TP1 girisin tam 1R uzaginda (scanner.service.ts FX_TP1_RR_MULT=1), pozisyon
// %50/%25/%25 dilimlere bolunuyor - scanner.service.ts computeSignalStats
// icindeki TP1_BANKED_FRACTION/TP2_BANKED_FRACTION/FX_TP2_RR_MULT ile BIREBIR
// ayni olmali (istatistik ve bu "golge" yurutme ayni pozisyon modelini
// varsaymali - bkz. auto-trade.service.ts basindaki ayni uyari).
const TP1_FRACTION = 0.5;
const TP2_FRACTION = 0.25;
const FX_TP2_RR_MULT = 2;

// Gercek broker henuz baglanmadigi icin gercek bir spread/komisyon rakami
// yok - ama sifir yazmak da yanlis olurdu (kullanici istegi 2026-08-22:
// "slippage ve komisyon bilgisi yazıcak mı" - sifir gosterilirse strateji
// olmadigindan daha karli gorunur). Tipik bir major forex paritesinin
// ortalama spread maliyeti (acilis+kapanis, ~0.02%/taraf) tahmini olarak
// dusuluyor - scanner.service.ts computeSignalStats'taki CRYPTO_TAKER_FEE_PCT
// ile ayni ruhta (gercek borsa/broker rakami degil, bilinen bir yaklasim).
const FOREX_SPREAD_COST_PCT = 0.0002; // taraf basina %0.02

const round2 = (n: number) => Math.round(n * 100) / 100;

// Money Maker'in FOREX taraﬁ - kullanici istegi 2026-08-22: "otomatik yapalım
// toggle ile ayrılsın kripto ve forex... ama api şimdilik kalsın, daha sonra
// kuracağız". Binance'te forex kontrati olmadigi gibi, henuz baglanmis bir
// forex brokeri de yok - bu yuzden bu servis HICBIR ZAMAN gercek bir emir
// gondermez. Bunun yerine Orca ACS'in zaten hesapladigi TrackedSignal fiyat
// gecislerini (scanner.service.ts updateTrackedSignals - WATCHING->TRIGGERED->
// HIT_TP1->HIT_TP2->HIT_TP3/HIT_STOP) birebir izleyip ayni AutoTrade tablosuna
// bir "golge" (shadow) pozisyon olarak yazar - kullanici Money Maker panelinde
// gercek bir pozisyonmus gibi acik/bekleyen kart, anlik kar/zarar ve
// istatistik gorur, ama borsada/broker'da hicbir sey acilmamistir. Ileride
// gercek bir forex brokeri baglaninca sadece "girisi/kapanisi tetikleyen"
// kisim (bu dosya) Binance emri gonderecek sekilde degistirilecek, kar/zarar
// modeli (R-multiple) zaten dogru.
@Injectable()
export class ForexAutoTradeService {
  private readonly logger = new Logger(ForexAutoTradeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getConfig() {
    const existing = await this.prisma.autoTradeConfig.findFirst();
    if (existing) return existing;
    return this.prisma.autoTradeConfig.create({ data: {} });
  }

  private async notifyAdmins(title: string, message: string) {
    const admins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
    await this.notifications.createForManyUsers(
      admins.map((a) => a.id),
      { type: 'SYSTEM', title, message },
    );
  }

  private async getLivePrice(symbol: string): Promise<number | null> {
    const yahooSymbol = YAHOO_MAP[symbol];
    if (!yahooSymbol) return null;
    const candles = await fetchYahoo(yahooSymbol, '1d', '1m');
    if (candles.length === 0) return null;
    return candles[candles.length - 1].close;
  }

  // scanner.service.ts createTrackedSignals icinde her yeni FOREX WATCHING
  // kaydi sonrasi cagrilir (bkz. o dosyadaki cagri).
  async onSignalCreated(sig: {
    id: string;
    symbol: string;
    direction: string;
    market: string;
    entryZoneTop: number;
    entryZoneBottom: number;
    stop: number;
  }) {
    if (sig.market !== 'FOREX') return;
    try {
      const config = await this.getConfig();
      if (!config.forexEnabled) return;

      const bullish = sig.direction === 'LONG';
      const entryPrice = bullish ? sig.entryZoneTop : sig.entryZoneBottom;
      const riskDistance = Math.abs(entryPrice - sig.stop);
      if (riskDistance <= 0) return;

      const simNotional = config.forexMarginUsdt * config.forexLeverage;
      await this.prisma.autoTrade.create({
        data: {
          trackedSignalId: sig.id,
          symbol: sig.symbol,
          direction: sig.direction,
          market: 'FOREX',
          status: 'PENDING_ENTRY',
          simNotional,
          // Sadece kart gorunumu icin (Miktar/Notional alani) - kar/zarar
          // hesabinda kullanilmiyor, R-multiple oranindan hesaplaniyor (bkz.
          // closeShadowTrade) - ceyrek/USD bazli olmayan pariteler (USDJPY vb.)
          // icin ham fiyat-birimi carpim mantigi yanlis olurdu.
          qty: simNotional / entryPrice,
        },
      });
      this.logger.log(`${sig.symbol} ${sig.direction}: forex golge pozisyon olusturuldu (giris bekleniyor, gercek broker emri YOK)`);
    } catch (err: any) {
      this.logger.error(`onSignalCreated hatasi (${sig.symbol}): ${err.message}`);
    }
  }

  // scanner.service.ts updateTrackedSignals icinde, WATCHING-suresi-doldu
  // erken-cikis dalinda (sig.market==='FOREX' iken) cagrilir - giris hic
  // gerceklesmeden setup suresi dolmus demektir.
  async onSignalExpired(trackedSignalId: string) {
    const trade = await this.prisma.autoTrade.findUnique({ where: { trackedSignalId } });
    if (!trade || trade.market !== 'FOREX') return;
    if (trade.status === 'CLOSED' || trade.status === 'EXPIRED') return;
    await this.prisma.autoTrade.update({ where: { id: trade.id }, data: { status: 'EXPIRED' } });
  }

  // scanner.service.ts updateTrackedSignals icinde, her FOREX TrackedSignal
  // icin o dongude uretilen `updates` objesiyle (status/stop/closedAt
  // alanlarindan biri veya birkaci) cagrilir - AutoTrade'i ayni gecise
  // esitler.
  async onSignalProgress(trackedSignalId: string, updates: Record<string, any>) {
    if (!updates || Object.keys(updates).length === 0) return;
    const trade = await this.prisma.autoTrade.findUnique({ where: { trackedSignalId } });
    if (!trade || trade.market !== 'FOREX') return;
    if (trade.status === 'CLOSED' || trade.status === 'EXPIRED' || trade.status === 'FAILED') return;

    const newStatus = updates.status as string | undefined;
    if (newStatus === 'INVALIDATED' || newStatus === 'EXPIRED') {
      await this.prisma.autoTrade.update({ where: { id: trade.id }, data: { status: 'EXPIRED' } });
      return;
    }

    const sig = await this.prisma.trackedSignal.findUnique({ where: { id: trackedSignalId } });
    if (!sig) return;
    const bullish = trade.direction === 'LONG';

    // Ilk kez WATCHING->TRIGGERED oluyor: golge "giris doldu" - gercek broker
    // emri yok, giris fiyati LIMIT hedefiyle ayni varsayilir (bkz.
    // auto-trade.service.ts onSignalCreated'daki ayni hesap).
    if (trade.entryPrice == null) {
      const entryPrice = bullish ? sig.entryZoneTop : sig.entryZoneBottom;
      await this.prisma.autoTrade.update({
        where: { id: trade.id },
        data: { status: 'OPEN', entryPrice, entryFilledAt: new Date() },
      });
      await this.notifyAdmins(
        'Money Maker (Forex): Pozisyon açıldı',
        `${trade.symbol} ${trade.direction}: giriş tetiklendi (simülasyon - gerçek broker bağlantısı henüz yok).`,
      );
    }

    if (!updates.closedAt) {
      if (newStatus === 'HIT_TP1') {
        await this.prisma.autoTrade.update({ where: { id: trade.id }, data: { status: 'BREAKEVEN_SET' } });
        await this.notifyAdmins('Money Maker (Forex): TP1 alındı', `${trade.symbol}: TP1 alındı, stop başabaşa çekildi (simülasyon).`);
      } else if (newStatus === 'HIT_TP2') {
        await this.notifyAdmins('Money Maker (Forex): TP2 alındı', `${trade.symbol}: TP2 alındı (simülasyon).`);
      }
      return;
    }

    // Kapanis. `newStatus` bazen set edilmemis olabilir (fiyat TP1/TP2
    // bankaya yatirdiktan sonra basabas stop'a donduyse - bkz.
    // scanner.service.ts updateTrackedSignals "alreadyBankedTp" dali, orada
    // sadece closedAt yazilir, status eskisi -HIT_TP1/HIT_TP2- kalir) - o
    // durumda etkin sonuc zaten sig.status'te duruyor.
    const effectiveStatus = newStatus ?? sig.status;
    let rNet: number;
    let closeReason: string;
    if (effectiveStatus === 'HIT_STOP') {
      rNet = -1;
      closeReason = 'STOP_FULL_LOSS';
    } else if (effectiveStatus === 'HIT_TP1') {
      rNet = TP1_FRACTION;
      closeReason = 'STOP_BREAKEVEN';
    } else if (effectiveStatus === 'HIT_TP2') {
      rNet = TP1_FRACTION + TP2_FRACTION * FX_TP2_RR_MULT;
      closeReason = 'STOP_BREAKEVEN';
    } else if (effectiveStatus === 'HIT_TP3') {
      rNet = TP1_FRACTION + TP2_FRACTION * FX_TP2_RR_MULT + (1 - TP1_FRACTION - TP2_FRACTION) * sig.rr;
      closeReason = 'TP3';
    } else {
      return;
    }

    const entryPriceFinal = trade.entryPrice ?? (bullish ? sig.entryZoneTop : sig.entryZoneBottom);
    // 1R'nin dolar karsiligi: risk mesafesi (giris-TP1, TP1 tanim geregi tam
    // 1R uzakta) fiyatin YUZDE kacini kapsiyorsa, sabit notional'in o kadari -
    // oran-bazli oldugu icin quote para birimi USD olmayan pariteler (USDJPY,
    // EURCHF vb.) icin de dogru (bkz. scanner.service.ts computeSignalStats
    // "riskPct" ile ayni yontem, ham fiyat-birimi carpimindan KASITLI olarak
    // kacinilir).
    const riskPct = entryPriceFinal > 0 ? Math.abs(sig.tp1 - entryPriceFinal) / entryPriceFinal : 0;
    const simNotional = trade.simNotional ?? (await this.getConfig()).forexMarginUsdt * (await this.getConfig()).forexLeverage;
    const dollarPer1R = simNotional * riskPct;
    const grossPnl = rNet * dollarPer1R;
    // Acilis+kapanis spread maliyeti (tahmini, bkz. FOREX_SPREAD_COST_PCT) -
    // negatif isaretle (Binance income kaydinin komisyon konvansiyonuyla ayni,
    // bkz. binance-futures-client.service.ts getRealizedPnlBreakdown).
    const commission = -round2(simNotional * FOREX_SPREAD_COST_PCT * 2);
    const netPnl = round2(grossPnl) + commission;

    await this.prisma.autoTrade.update({
      where: { id: trade.id },
      data: { status: 'CLOSED', closeReason, realizedPnl: round2(grossPnl), commission, funding: 0, netPnl: round2(netPnl) },
    });
    await this.notifyAdmins(
      'Money Maker (Forex): Pozisyon kapandı',
      `${trade.symbol}: ${closeReason} ile kapandı (simülasyon) — ${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}`,
    );
  }

  async getStats() {
    const closed = await this.prisma.autoTrade.findMany({ where: { market: 'FOREX', status: 'CLOSED' } });
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

  // bkz. auto-trade.service.ts getMarketContext (BTC korelasyon karti) -
  // forex tarafinin referans varligi DXY (kullanici istegi 2026-08-22).
  async getMarketContext(symbols: string[]) {
    const uniqueSymbols = Array.from(new Set(symbols));
    const [dxyCandles, ...symbolCandlesArr] = await Promise.all([
      fetchYahoo(DXY_YAHOO_SYMBOL, '5d', '1h'),
      ...uniqueSymbols.map((s) => (YAHOO_MAP[s] ? fetchYahoo(YAHOO_MAP[s], '5d', '1h') : Promise.resolve([] as Candle[]))),
    ]);
    const dxyRecent = dxyCandles.slice(-24);
    const dxyCloses = dxyRecent.map((c) => c.close);
    const dxyPrice = dxyRecent.length > 0 ? dxyRecent[dxyRecent.length - 1].close : null;
    const dxyChangePercent =
      dxyPrice != null && dxyRecent[0]?.open ? ((dxyPrice - dxyRecent[0].open) / dxyRecent[0].open) * 100 : null;
    const correlations: Record<string, number | null> = {};
    uniqueSymbols.forEach((s, i) => {
      correlations[s] = pearsonReturnsCorrelation(dxyCloses, symbolCandlesArr[i].slice(-24).map((c) => c.close));
    });
    return { dxyCandles: dxyRecent, dxyPrice, dxyChangePercent, correlations };
  }

  // bkz. auto-trade.service.ts getLivePositions - forex tarafinda hicbir
  // borsa/broker sorgusu yapilmaz, TP1/TP2/TP3 dolu bilgisi dogrudan
  // TrackedSignal.status'ten (zaten fiyat-bazli gercek zemin) okunur.
  async getLivePositions() {
    const [activeTrades, recentClosed] = await Promise.all([
      this.prisma.autoTrade.findMany({
        where: { market: 'FOREX', status: { in: ['PENDING_ENTRY', 'OPEN', 'BREAKEVEN_SET'] } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.autoTrade.findMany({
        where: { market: 'FOREX', status: 'CLOSED', createdAt: { gt: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);
    const openTrades = [...activeTrades, ...recentClosed];
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

    return Promise.all(
      openTrades.map(async (trade) => {
        const sig = await this.prisma.trackedSignal.findUnique({ where: { id: trade.trackedSignalId } });
        const isClosed = trade.status === 'CLOSED';
        const isPending = trade.status === 'PENDING_ENTRY';
        const bullish = trade.direction === 'LONG';

        if (isClosed || !sig) {
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
            stopTriggered: trade.closeReason === 'STOP_FULL_LOSS' || trade.closeReason === 'STOP_BREAKEVEN',
            tp1Price: null,
            tp2Price: null,
            tp3Price: null,
            tp1Filled: trade.closeReason === 'TP3' || trade.closeReason === 'STOP_BREAKEVEN',
            tp2Filled: false,
            tp3Filled: trade.closeReason === 'TP3',
            realizedSoFar: trade.realizedPnl ?? 0,
            commissionSoFar: trade.commission ?? 0,
            fundingSoFar: 0,
          };
        }

        const entryPrice = trade.entryPrice ?? (bullish ? sig.entryZoneTop : sig.entryZoneBottom);
        const tp1Filled = ['HIT_TP1', 'HIT_TP2', 'HIT_TP3'].includes(sig.status);
        const tp2Filled = ['HIT_TP2', 'HIT_TP3'].includes(sig.status);
        const tp3Filled = sig.status === 'HIT_TP3';
        const config = await this.getConfig();
        const simNotional = trade.simNotional ?? config.forexMarginUsdt * config.forexLeverage;

        let unrealizedProfit: number | null = null;
        let markPrice: number | null = null;
        if (!isPending) {
          markPrice = await this.getLivePrice(trade.symbol);
          const riskDistance = Math.abs(sig.tp1 - entryPrice);
          const remainingFraction = tp2Filled ? 1 - TP1_FRACTION - TP2_FRACTION : tp1Filled ? 1 - TP1_FRACTION : 1;
          if (markPrice != null && riskDistance > 0) {
            const currentR = (bullish ? markPrice - entryPrice : entryPrice - markPrice) / riskDistance;
            const riskPct = Math.abs(riskDistance / entryPrice);
            unrealizedProfit = round2(remainingFraction * simNotional * riskPct * currentR);
          }
        }
        // Simdiye kadar (TP1/TP2 kismi kapanislarindan) bankaya yatmis kar -
        // bkz. onSignalProgress'teki ayni rNet formulu, sadece kapanmamis
        // parca haric.
        let realizedSoFar = 0;
        if (tp1Filled) {
          const riskPct = Math.abs(sig.tp1 - entryPrice) / entryPrice;
          const dollarPer1R = simNotional * riskPct;
          realizedSoFar += TP1_FRACTION * dollarPer1R;
          if (tp2Filled) realizedSoFar += TP2_FRACTION * FX_TP2_RR_MULT * dollarPer1R;
        }

        return {
          id: trade.id,
          symbol: trade.symbol,
          direction: trade.direction,
          status: trade.status,
          closeReason: trade.closeReason,
          entryPrice,
          qty: trade.qty,
          markPrice,
          unrealizedProfit,
          notional: isPending ? null : simNotional,
          leverage: isPending ? null : config.forexLeverage,
          // Gercek bir broker/marjin cagrisi yok - sadece izole marjin
          // mantigina gore kaba bir tahmin (bakim marji ihmal edilir).
          liquidationPrice: isPending ? null : bullish ? entryPrice * (1 - 1 / config.forexLeverage) : entryPrice * (1 + 1 / config.forexLeverage),
          fundingRate: null,
          stopPrice: sig.stop,
          stopTriggered: false,
          tp1Price: sig.tp1,
          tp2Price: sig.tp2,
          tp3Price: sig.tp3,
          tp1Filled,
          tp2Filled,
          tp3Filled,
          realizedSoFar: round2(realizedSoFar),
          // Acik pozisyonda henuz sadece GIRIS tarafinin spread maliyeti
          // "odenmis" sayilir - kapanis tarafi kapanista eklenir (bkz.
          // onSignalProgress/closePosition, orada iki taraf birden).
          commissionSoFar: isPending ? 0 : -round2(simNotional * FOREX_SPREAD_COST_PCT),
          fundingSoFar: 0,
        };
      }),
    );
  }

  // Kullanici panelden elle kapatir - kalan acik dilim, o anki canli fiyata
  // gore kapatilmis sayilir (gercek broker emri yok, sadece kayit).
  async closePosition(tradeId: string) {
    const trade = await this.prisma.autoTrade.findUnique({ where: { id: tradeId } });
    if (!trade || trade.market !== 'FOREX' || trade.status === 'CLOSED' || trade.status === 'EXPIRED') return;

    if (trade.status === 'PENDING_ENTRY') {
      await this.prisma.autoTrade.update({ where: { id: trade.id }, data: { status: 'EXPIRED' } });
      return;
    }

    const sig = await this.prisma.trackedSignal.findUnique({ where: { id: trade.trackedSignalId } });
    const bullish = trade.direction === 'LONG';
    const entryPrice = trade.entryPrice ?? (sig ? (bullish ? sig.entryZoneTop : sig.entryZoneBottom) : null);
    const markPrice = await this.getLivePrice(trade.symbol);
    const config = await this.getConfig();
    const simNotional = trade.simNotional ?? config.forexMarginUsdt * config.forexLeverage;

    let netPnl = 0;
    if (sig && entryPrice != null && markPrice != null) {
      const tp1Filled = ['HIT_TP1', 'HIT_TP2', 'HIT_TP3'].includes(sig.status);
      const tp2Filled = ['HIT_TP2', 'HIT_TP3'].includes(sig.status);
      const riskDistance = Math.abs(sig.tp1 - entryPrice);
      const riskPct = riskDistance > 0 ? riskDistance / entryPrice : 0;
      const dollarPer1R = simNotional * riskPct;
      let bankedR = 0;
      if (tp1Filled) bankedR += TP1_FRACTION;
      if (tp2Filled) bankedR += TP2_FRACTION * FX_TP2_RR_MULT;
      const remainingFraction = tp2Filled ? 1 - TP1_FRACTION - TP2_FRACTION : tp1Filled ? 1 - TP1_FRACTION : 1;
      const currentR = riskDistance > 0 ? (bullish ? markPrice - entryPrice : entryPrice - markPrice) / riskDistance : 0;
      netPnl = round2(bankedR * dollarPer1R + remainingFraction * dollarPer1R * currentR);
    }

    const commission = -round2(simNotional * FOREX_SPREAD_COST_PCT * 2);
    await this.prisma.autoTrade.update({
      where: { id: trade.id },
      data: { status: 'CLOSED', closeReason: 'MANUAL_CLOSE', realizedPnl: netPnl, commission, funding: 0, netPnl: round2(netPnl + commission) },
    });
    if (sig && !sig.closedAt) {
      await this.prisma.trackedSignal.update({ where: { id: sig.id }, data: { closedAt: new Date() } });
    }
  }

  async closeAllPositions() {
    const openTrades = await this.prisma.autoTrade.findMany({
      where: { market: 'FOREX', status: { in: ['PENDING_ENTRY', 'OPEN', 'BREAKEVEN_SET'] } },
    });
    let closed = 0;
    for (const trade of openTrades) {
      await this.closePosition(trade.id);
      closed += 1;
    }
    return { closed };
  }
}
