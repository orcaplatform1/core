import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Setup {
  direction: 'LONG' | 'SHORT';
  currentPrice: number;
  entry: number;
  entryZoneTop: number;
  entryZoneBottom: number;
  stop: number;
  tp1: number;
  tp2: number;
  tp3: number;
  rr: number;
  reasons: string[];
  confidenceScore: number;
  confirmedCount: number;
  strength: 'GUCLU' | 'ORTA' | 'RISKLI';
  stillValid: boolean;
  distancePercent: number;
  patternType?: 'BREAKOUT_CONTINUATION';
}

// buildDayTradeSetup icin funnel gozlem sayaclari (scanDayTrade loop'u sonunda
// console.log ile basilir) - hangi asamada kac sembolun elendigini izlemek icin
interface DayTradeStageCounter {
  rangeFound: number;
  breakoutContinuationConfirmed: number;
  confirmedCountPassed: number;
  rrPassed: number;
}

const YAHOO_MAP: Record<string, string> = {
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X', USDCHF: 'USDCHF=X',
  AUDUSD: 'AUDUSD=X', USDCAD: 'USDCAD=X', NZDUSD: 'NZDUSD=X', EURGBP: 'EURGBP=X',
  EURJPY: 'EURJPY=X', GBPJPY: 'GBPJPY=X', EURCHF: 'EURCHF=X', AUDJPY: 'AUDJPY=X',
  CADJPY: 'CADJPY=X', XAUUSD: 'GC=F', XAGUSD: 'SI=F', BRENT: 'BZ=F', WTI: 'CL=F',
  USDCNH: 'USDCNH=X', USDZAR: 'USDZAR=X', USDMXN: 'USDMXN=X',
};

@Injectable()
export class ScannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async fetchTopBinanceSymbols(limit: number): Promise<string[]> {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!res.ok) return [];
      const data = await res.json();
      return data
        .filter((t: any) => t.symbol.endsWith('USDT') && !t.symbol.includes('UPUSDT') && !t.symbol.includes('DOWNUSDT'))
        .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, limit)
        .map((t: any) => t.symbol);
    } catch {
      return [];
    }
  }

  private async fetchBinanceDaily(symbol: string, limit = 250): Promise<Candle[]> {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    // Son eleman henuz kapanmamis (oluşan) mum olabilir, sadece
    // kapanmis mumlarla calis - yanlis/repaint sinyal riskini onler
    const closed = data.slice(0, -1);
    return closed.map((c: any) => ({
      time: c[0], open: parseFloat(c[1]), high: parseFloat(c[2]),
      low: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5]),
    }));
  }

  private async fetchBinance4h(symbol: string, limit = 120): Promise<Candle[]> {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const closed = data.slice(0, -1);
    return closed.map((c: any) => ({
      time: c[0], open: parseFloat(c[1]), high: parseFloat(c[2]),
      low: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5]),
    }));
  }

  private async fetchBinance1h(symbol: string, limit = 120): Promise<Candle[]> {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const closed = data.slice(0, -1);
    return closed.map((c: any) => ({
      time: c[0], open: parseFloat(c[1]), high: parseFloat(c[2]),
      low: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5]),
    }));
  }

  private async fetchBinance15m(symbol: string, limit = 120): Promise<Candle[]> {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const closed = data.slice(0, -1);
    return closed.map((c: any) => ({
      time: c[0], open: parseFloat(c[1]), high: parseFloat(c[2]),
      low: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5]),
    }));
  }

  private async fetchBinanceFundingRate(symbol: string): Promise<number | null> {
    try {
      const url = `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return parseFloat(data.lastFundingRate) * 100;
    } catch {
      return null;
    }
  }

  private async fetchYahoo(yahooSymbol: string, range: string, interval: string): Promise<Candle[]> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${interval}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];
    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    return timestamps
      .map((t, i) => ({
        time: t * 1000, open: quote.open?.[i], high: quote.high?.[i],
        low: quote.low?.[i], close: quote.close?.[i], volume: quote.volume?.[i] ?? 0,
      }))
      .filter((c) => c.close != null);
  }

  private toWeekly(daily: Candle[]): Candle[] {
    const weekly: Candle[] = [];
    for (let i = 0; i < daily.length; i += 7) {
      const chunk = daily.slice(i, i + 7);
      if (chunk.length === 0) continue;
      weekly.push({
        time: chunk[0].time, open: chunk[0].open,
        high: Math.max(...chunk.map((c) => c.high)),
        low: Math.min(...chunk.map((c) => c.low)),
        close: chunk[chunk.length - 1].close,
        volume: chunk.reduce((s, c) => s + c.volume, 0),
      });
    }
    return weekly;
  }

  private ema(values: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const result: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      result.push(values[i] * k + result[i - 1] * (1 - k));
    }
    return result;
  }

  // Sinyal DB'ye yazilmadan/gosterilmeden hemen once uygulanan son guvenlik katmani.
  // "stop, TP3'u gecmesin" gibi tek bir gecersiz durumu yakalayan noktasal kontroller
  // yeterli degil (ESPUSDT SHORT vakasinda oldugu gibi stop TP3'ten uzakta olmasa
  // bile Turtle Soup kirilim mumunun asiri buyuk fitili yuzunden gercek R:R degeri
  // anlamsiz kalabiliyordu) - bunun yerine risk/reward oranina dogrudan taban konur.
  // SCANNER_MIN_RR ortam degiskeniyle ayarlanabilir, tanimli/gecersizse 1.5 kullanilir.
  private getMinRR(): number {
    const configured = Number(process.env.SCANNER_MIN_RR);
    return Number.isFinite(configured) && configured > 0 ? configured : 1.5;
  }

  private atr(candles: Candle[], period = 14): number {
    const trs: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      const prev = candles[i - 1];
      trs.push(Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)));
    }
    const recent = trs.slice(-period);
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }

  private getTrend(candles: Candle[]): 'UP' | 'DOWN' | 'FLAT' {
    if (candles.length < 10) return 'FLAT';
    const closes = candles.map((c) => c.close);
    const ema50 = this.ema(closes, Math.min(50, closes.length - 1));
    const ema200 = this.ema(closes, Math.min(200, closes.length - 1));
    const last50 = ema50[ema50.length - 1];
    const last200 = ema200[ema200.length - 1];
    if (last50 > last200 * 1.002) return 'UP';
    if (last50 < last200 * 0.998) return 'DOWN';
    return 'FLAT';
  }

  private findSwingHighs(candles: Candle[], lookback = 3): number[] {
    const indices: number[] = [];
    for (let i = lookback; i < candles.length - lookback; i++) {
      const window = candles.slice(i - lookback, i + lookback + 1);
      if (window.every((c) => c.high <= candles[i].high)) indices.push(i);
    }
    return indices;
  }

  private findSwingLows(candles: Candle[], lookback = 3): number[] {
    const indices: number[] = [];
    for (let i = lookback; i < candles.length - lookback; i++) {
      const window = candles.slice(i - lookback, i + lookback + 1);
      if (window.every((c) => c.low >= candles[i].low)) indices.push(i);
    }
    return indices;
  }

  private hasBOS(candles: Candle[], direction: 'LONG' | 'SHORT'): boolean {
    const highs = this.findSwingHighs(candles);
    const lows = this.findSwingLows(candles);
    const lastClose = candles[candles.length - 1].close;
    if (direction === 'LONG' && highs.length >= 1) {
      return lastClose > candles[highs[highs.length - 1]].high;
    }
    if (direction === 'SHORT' && lows.length >= 1) {
      return lastClose < candles[lows[lows.length - 1]].low;
    }
    return false;
  }

  private findReversalCandle(
    candles: Candle[],
    atrValue: number,
    levelPrice: number,
    bullish: boolean,
  ): { index: number; low: number; high: number; open: number; close: number } | null {
    const proximityBuffer = atrValue * 1.0;
    const lookback = Math.min(5, candles.length - 1);
    for (let i = candles.length - 1; i >= candles.length - lookback; i--) {
      const c = candles[i];
      const prev = candles[i - 1];
      if (!prev) continue;
      const range = c.high - c.low;
      if (range <= 0) continue;
      const body = Math.abs(c.close - c.open);
      const avgVolume = candles.slice(Math.max(0, i - 20), i).reduce((s, x) => s + x.volume, 0) / Math.min(20, i);
      const volumeConfirmed = avgVolume > 0 ? c.volume > avgVolume * 1.1 : true;

      if (bullish) {
        const nearLevel = c.low <= levelPrice + proximityBuffer && c.low >= levelPrice - proximityBuffer;
        if (!nearLevel) continue;
        const isBullishClose = c.close > c.open;
        const lowerWick = Math.min(c.open, c.close) - c.low;
        const isPinBar = lowerWick >= body * 1.5 && c.close > c.low + range * 0.5;
        const isEngulfing = c.close > c.open && c.close > prev.open && c.open < prev.close && prev.close < prev.open;
        if (isBullishClose && (isPinBar || isEngulfing) && volumeConfirmed) {
          return { index: i, low: c.low, high: c.high, open: c.open, close: c.close };
        }
      } else {
        const nearLevel = c.high <= levelPrice + proximityBuffer && c.high >= levelPrice - proximityBuffer;
        if (!nearLevel) continue;
        const isBearishClose = c.close < c.open;
        const upperWick = c.high - Math.max(c.open, c.close);
        const isPinBar = upperWick >= body * 1.5 && c.close < c.high - range * 0.5;
        const isEngulfing = c.close < c.open && c.close < prev.open && c.open > prev.close && prev.close > prev.open;
        if (isBearishClose && (isPinBar || isEngulfing) && volumeConfirmed) {
          return { index: i, low: c.low, high: c.high, open: c.open, close: c.close };
        }
      }
    }
    return null;
  }

  private buildSetup(
    dailyCandles: Candle[],
    trend4h: 'UP' | 'DOWN' | 'FLAT',
    weeklyCandles: Candle[],
    fundingRate: number | null,
  ): Setup | null {
    if (dailyCandles.length < 60) return null;
    const trendDaily = this.getTrend(dailyCandles);
    if (trendDaily === 'FLAT') return null;
    const direction: 'LONG' | 'SHORT' = trendDaily === 'UP' ? 'LONG' : 'SHORT';
    const bullish = direction === 'LONG';
    const atrValue = this.atr(dailyCandles);
    const swingHighs = this.findSwingHighs(dailyCandles);
    const swingLows = this.findSwingLows(dailyCandles);

    const htfBiasConfirmed = trendDaily === trend4h;

    const recentSwingIndices = bullish
      ? swingLows.filter((i) => i >= dailyCandles.length - 40)
      : swingHighs.filter((i) => i >= dailyCandles.length - 40);
    if (recentSwingIndices.length === 0) return null;
    const levelIndex = recentSwingIndices[recentSwingIndices.length - 1];
    const levelPrice = bullish ? dailyCandles[levelIndex].low : dailyCandles[levelIndex].high;
    const lastCandle = dailyCandles[dailyCandles.length - 1];
    const distanceToLevel = Math.abs(lastCandle.close - levelPrice);
    const atLevelConfirmed = distanceToLevel <= atrValue * 1.5;

    const reversalCandle = this.findReversalCandle(dailyCandles, atrValue, levelPrice, bullish);
    const reversalConfirmed = reversalCandle !== null;

    const mssConfirmed = this.hasBOS(dailyCandles, direction);

    if (!atLevelConfirmed || !reversalConfirmed || !reversalCandle) return null;

    const confirmedCount = [htfBiasConfirmed, atLevelConfirmed, reversalConfirmed, mssConfirmed].filter(Boolean).length;
    if (confirmedCount < 3) return null;

    const entryZoneTop = Math.max(reversalCandle.open, reversalCandle.close);
    const entryZoneBottom = Math.min(reversalCandle.open, reversalCandle.close);
    const entry = (entryZoneTop + entryZoneBottom) / 2;

    const stillValid = lastCandle.close <= entryZoneTop && lastCandle.close >= entryZoneBottom;
    let distancePercent = 0;
    if (lastCandle.close > entryZoneTop) {
      distancePercent = ((lastCandle.close - entryZoneTop) / entryZoneTop) * 100;
    } else if (lastCandle.close < entryZoneBottom) {
      distancePercent = ((entryZoneBottom - lastCandle.close) / entryZoneBottom) * 100;
    }
    distancePercent = Math.round(distancePercent * 100) / 100;
    if (!stillValid && distancePercent > 5) return null;

    // Stop: fitil ucuna degil, ondan ONCE olusmus gercek bir yapisal swing
    // seviyesine konur - piyasa daha once oraya kadar sarkip geri donmus,
    // sadece son mumun kendi fitiline gore stop koymak stop-hunt'a acik olurdu.
    const wickBuffer = atrValue * 0.15;
    let stop: number;
    if (bullish) {
      const structuralStops = swingLows
        .map((i) => dailyCandles[i].low)
        .filter((l) => l < entryZoneBottom)
        .sort((a, b) => b - a);
      stop = structuralStops.length > 0 ? structuralStops[0] - wickBuffer : reversalCandle.low - wickBuffer;
    } else {
      const structuralStops = swingHighs
        .map((i) => dailyCandles[i].high)
        .filter((h) => h > entryZoneTop)
        .sort((a, b) => a - b);
      stop = structuralStops.length > 0 ? structuralStops[0] + wickBuffer : reversalCandle.high + wickBuffer;
    }
    // R:R risk/reward yon bazli (signed) hesaplanir - abs() ile gizlenirse stop veya
    // TP yanlis tarafta kalmis (yapisal olarak bozuk) bir setup bile pozitif bir R:R
    // gosterip gecebilir. LONG'da stop entry'nin ALTINDA olmali (risk = entry-stop),
    // SHORT'ta stop entry'nin USTUNDE olmali (risk = stop-entry); degilse reddedilir.
    const risk = bullish ? entry - stop : stop - entry;
    if (risk <= 0) return null;

    // TP1: gercek price action pratiginde kismi kar alma noktasi olarak 1.5R
    // kullanilir (pozisyonun yarisi burada kapatilir) - yaygin kabul gormus kural.
    const tp1 = bullish ? entry + risk * 1.5 : entry - risk * 1.5;

    // TP2/TP3: grafikteki yapisal seviyelerden, ama SADECE TP1'in DE otesinde
    // kalanlar - yoksa yapisal bir seviye TP1'den yakin cikip TP1 < TP2 < TP3
    // sirasini (kar yonunde artan mesafe) bozabilir, R:R anlamsizlasir.
    let structuralLevels: number[];
    if (bullish) {
      structuralLevels = swingHighs
        .map((i) => dailyCandles[i].high)
        .filter((h) => h > tp1)
        .sort((a, b) => a - b);
    } else {
      structuralLevels = swingLows
        .map((i) => dailyCandles[i].low)
        .filter((l) => l < tp1)
        .sort((a, b) => b - a);
    }
    if (structuralLevels.length < 2) return null;

    const [tp2, tp3] = structuralLevels;
    // Reward de ayni sekilde yon bazli: LONG'da TP2 entry'nin USTUNDE, SHORT'ta
    // ALTINDA olmali - degilse (TP2 zaten gecilmis/yanlis yonde) setup reddedilir.
    const mainReward = bullish ? tp2 - entry : entry - tp2;
    if (mainReward <= 0) return null;
    const rr = mainReward / risk;
    if (rr < this.getMinRR()) return null;

    const reasons: string[] = [];
    reasons.push(`Yön: ${bullish ? 'Yükseliş (LONG)' : 'Düşüş (SHORT)'}`);
    if (htfBiasConfirmed) reasons.push('HTF Bias: Günlük + kısa vadeli trend uyumlu');
    reasons.push(`Yapısal seviye: ${bullish ? 'Swing Low desteği' : 'Swing High direnci'}`);
    reasons.push(`Reversal mumu: ${bullish ? 'boğa' : 'ayı'} pin bar/engulfing + hacim teyidi`);
    if (mssConfirmed) reasons.push('Market Structure Shift (BOS) onaylandı');
    const weeklyTrend = this.getTrend(weeklyCandles);
    if (weeklyTrend === trendDaily) reasons.push('Haftalık zaman dilimi de aynı yönü destekliyor');
    if (fundingRate !== null) {
      if (bullish && fundingRate < -0.05) reasons.push(`Funding rate aşırı negatif (${fundingRate.toFixed(3)}%)`);
      else if (!bullish && fundingRate > 0.05) reasons.push(`Funding rate aşırı pozitif (${fundingRate.toFixed(3)}%)`);
    }
    if (!stillValid) reasons.push('UYARI: Fiyat bölgeden uzaklaşmış olabilir, teyit et');

    const strength: 'GUCLU' | 'ORTA' | 'RISKLI' =
      confirmedCount === 4 ? 'GUCLU' : confirmedCount === 3 ? 'ORTA' : 'RISKLI';
    const confidenceScore = confirmedCount * 25;

    return {
      direction, currentPrice: lastCandle.close, entry, entryZoneTop, entryZoneBottom, stop, tp1, tp2, tp3,
      rr: Math.round(rr * 100) / 100, reasons, confidenceScore,
      confirmedCount, strength, stillValid, distancePercent,
    };
  }
  // Verilen fiyat dizisini tolerans bandina gore kumeler ve en cok test edilen
  // (en kalabalik kume) seviyeyi dondurur - "en az 2 kez test edilmis sinir" icin kullanilir
  private findMostTestedLevel(prices: number[], tolerance: number): { level: number; tests: number } | null {
    if (prices.length === 0) return null;
    let best: { level: number; tests: number } | null = null;
    for (const price of prices) {
      const cluster = prices.filter((p) => Math.abs(p - price) <= tolerance);
      const level = cluster.reduce((a, b) => a + b, 0) / cluster.length;
      if (!best || cluster.length > best.tests) best = { level, tests: cluster.length };
    }
    return best;
  }

  // Verilen mum dizisinden ust/alt sinirlari en az 2'ser kez test edilmis bir
  // range bulur (mevcut swing-high/low mantigi kumelemeye uyarlanmis hali)
  private findTestedRange(
    candles: Candle[],
    atrValue: number,
  ): { upper: number; lower: number; upperTests: number; lowerTests: number } | null {
    const swingHighIdx = this.findSwingHighs(candles, 2);
    const swingLowIdx = this.findSwingLows(candles, 2);
    if (swingHighIdx.length < 2 || swingLowIdx.length < 2) return null;

    const highPrices = swingHighIdx.map((i) => candles[i].high);
    const lowPrices = swingLowIdx.map((i) => candles[i].low);
    const tolerance = atrValue * 0.5;

    const upperLevel = this.findMostTestedLevel(highPrices, tolerance);
    const lowerLevel = this.findMostTestedLevel(lowPrices, tolerance);
    if (!upperLevel || !lowerLevel) return null;
    if (upperLevel.tests < 2 || lowerLevel.tests < 2) return null;
    if (upperLevel.level <= lowerLevel.level) return null;

    return {
      upper: upperLevel.level, lower: lowerLevel.level,
      upperTests: upperLevel.tests, lowerTests: lowerLevel.tests,
    };
  }

  // Swing (scanCrypto) icin de Day Trade ile AYNI Breakout Continuation modeli
  // kullanilir (ayri bir modelleme yok - tek fark zaman dilimi olcegi): range
  // GUNLUK mumlardan, kirilim/teyit de GUNLUK mumlarla (swing zaten yavas hareket
  // ettigi icin day trade'deki 4H-range/15dk-teyit ayrimina burada gerek yok, ikisi
  // de gunluk). Trend filtresi (EMA50/200), HTF bias ve confirmation sayaci
  // buildDayTradeSetup ile AYNI.
  private buildSwingSetup(
    dailyCandles: Candle[],
    trend4h: 'UP' | 'DOWN' | 'FLAT',
    weeklyCandles: Candle[],
    fundingRate: number | null,
  ): Setup | null {
    if (dailyCandles.length < 60) return null;
    const trendDaily = this.getTrend(dailyCandles);
    if (trendDaily === 'FLAT') return null;
    const direction: 'LONG' | 'SHORT' = trendDaily === 'UP' ? 'LONG' : 'SHORT';
    const bullish = direction === 'LONG';
    const atrValue = this.atr(dailyCandles);

    const htfBiasConfirmed = trendDaily === trend4h;

    // Range: son 20-30 gunluk mumdan, ust/alt sinir en az 2'ser kez test edilmis olmali
    const rangeCandles = dailyCandles.slice(-30);
    const range = this.findTestedRange(rangeCandles, atrValue);
    if (!range) return null;
    const rangeWidth = range.upper - range.lower;

    // Son iki gunluk muma bakilir: breakoutCandle siniri kirar, confirmCandle onu teyit eder.
    const n = dailyCandles.length;
    const breakoutCandle = dailyCandles[n - 2];
    const confirmCandle = dailyCandles[n - 1];

    // Breakout Continuation: breakoutCandle KAPANISLA yon tarafindaki siniri kirar
    // (bullish'te UST sinir), confirmCandle da AYNI yonde range DISINDA kapanir
    // (geri donmez) - gercek kirilim, kirilim yonunde devam.
    let breakoutContinuationConfirmed = false;
    if (bullish) {
      const brokeUpper = breakoutCandle.close > range.upper;
      const continuedOutside = confirmCandle.close > range.upper;
      if (brokeUpper && continuedOutside) breakoutContinuationConfirmed = true;
    } else {
      const brokeLower = breakoutCandle.close < range.lower;
      const continuedOutside = confirmCandle.close < range.lower;
      if (brokeLower && continuedOutside) breakoutContinuationConfirmed = true;
    }
    if (!breakoutContinuationConfirmed) return null;

    const mssConfirmed = this.hasBOS(dailyCandles, direction);

    // confirmedCount buildDayTradeSetup ile ayni sekilde hesaplanir: range bulunmus
    // ve Breakout Continuation teyit edilmis olmasi zaten zorunlu (yukarida return
    // null), tipki eski atLevelConfirmed/reversalConfirmed'in her zaman true olmasi
    // gibi. Esik 3'ten 2'ye dusuruldu - Breakout Continuation zaten guclu bir filtre
    // oldugu icin range+teyidin tek basina (HTF bias veya MSS olmadan da) yeterli
    // sayilmasi tercih edildi.
    const confirmedCount = [htfBiasConfirmed, true, breakoutContinuationConfirmed, mssConfirmed].filter(Boolean).length;
    if (confirmedCount < 2) return null;

    const entryZoneTop = Math.max(confirmCandle.open, confirmCandle.close);
    const entryZoneBottom = Math.min(confirmCandle.open, confirmCandle.close);
    const entry = confirmCandle.close;

    const lastCandle = confirmCandle;
    const stillValid = lastCandle.close <= entryZoneTop && lastCandle.close >= entryZoneBottom;
    const distancePercent = 0;

    // Stop: kirilan range sinirinin hemen gerisi - fiyat range'e geri donerse
    // (sinir tekrar icine girerse) trade zaten gecersizdir
    const wickBuffer = atrValue * 0.15;
    const stop = bullish ? range.upper - wickBuffer : range.lower + wickBuffer;
    // R:R risk/reward yon bazli (signed) hesaplanir - abs() kullanmak, stop veya TP
    // yanlis tarafta kalmis bozuk bir setup'ta bile pozitif R:R gosterip gecirebilirdi.
    // LONG'da stop entry'nin ALTINDA (risk=entry-stop), SHORT'ta USTUNDE (risk=stop-entry)
    // olmali; degilse yapisal olarak tutarsiz demektir, sinyal reddedilir.
    const risk = bullish ? entry - stop : stop - entry;
    if (risk <= 0) return null;

    // TP1: kirilim yonunde olculu hareket (range genisligi kadar projeksiyon).
    // TP2/TP3: bu projeksiyonun otesindeki en yakin iki yapisal gunluk swing seviyesi;
    // yeterli swing yoksa range genisligi katlariyla devam edilir.
    const tp1 = bullish ? range.upper + rangeWidth : range.lower - rangeWidth;
    if (bullish ? tp1 <= entry : tp1 >= entry) return null;
    const swingIdx = bullish ? this.findSwingHighs(dailyCandles, 2) : this.findSwingLows(dailyCandles, 2);
    const structuralLevels: number[] = [];
    const sortedLevels = swingIdx
      .map((i) => (bullish ? dailyCandles[i].high : dailyCandles[i].low))
      .filter((lvl) => (bullish ? lvl > tp1 : lvl < tp1))
      .sort((a, b) => (bullish ? a - b : b - a));
    for (const lvl of sortedLevels) {
      const last = structuralLevels[structuralLevels.length - 1];
      if (last !== undefined && Math.abs(lvl - last) < atrValue * 0.3) continue;
      structuralLevels.push(lvl);
      if (structuralLevels.length === 2) break;
    }
    // Yapisal seviye bulunamayan durumlarda (SHORT sinyallerinin ezici cogunlugunda -
    // zaten dusus trendindeki bir coin icin tp1 son ~250 gunde hic gorulmemis bir
    // fiyata denk dusuyor, yapisal arama hep bos donuyor) fallback adimi rangeWidth
    // ile sinirsiz katlanip gerceklikten kopuk hedefler uretiyordu (bkz. ACEUSDT %204,
    // HEIUSDT %77). Fallback adimi artik gunluk ATR ile de sinirlaniyor - dar
    // konsolidasyonlarda ATR*0.75 rangeWidth'i asabildigi icin min() iki yonlu koruma saglar.
    const fallbackStep = Math.min(rangeWidth, atrValue * 0.75);
    let tp2 = structuralLevels[0] ?? (bullish ? tp1 + fallbackStep : tp1 - fallbackStep);
    let tp3 = structuralLevels[1] ?? (bullish ? tp2 + fallbackStep : tp2 - fallbackStep);
    // Ek guvenlik agi: ATR de asiri oynak coinlerde (ACEUSDT gibi) buyuk kalabiliyor -
    // fallback'ten gelen (yapisal olmayan) hedefler entry'den %25'in otesine gecemez.
    const ABS_TP_CAP_PCT = 0.25;
    const maxAbsDistance = entry * ABS_TP_CAP_PCT;
    if (structuralLevels[0] === undefined && Math.abs(tp2 - entry) > maxAbsDistance) {
      tp2 = bullish ? entry + maxAbsDistance : entry - maxAbsDistance;
    }
    if (structuralLevels[1] === undefined && Math.abs(tp3 - entry) > maxAbsDistance) {
      tp3 = bullish ? entry + maxAbsDistance : entry - maxAbsDistance;
    }
    // Monotonluk garantisi: TP1->TP2->TP3 LONG'da kesin artan, SHORT'ta kesin azalan
    // olmali. Yapisal seviye + fallback + %25 tavaninin karisimi bunu bozabiliyordu -
    // orn. HEIUSDT'de yapisal TP2 entry'den %35 uzaktayken, tavana takilan fallback
    // TP3 sadece %22 uzakta kaliyordu (TP3, TP2'den entry'ye daha yakin - yanlis sira).
    // Kaynagi ne olursa olsun (yapisal/fallback/capli) son adimda sira zorlanir.
    if (bullish) {
      if (tp2 <= tp1) tp2 = tp1 * 1.001;
      if (tp3 <= tp2) tp3 = tp2 * 1.001;
    } else {
      if (tp2 >= tp1) tp2 = tp1 * 0.999;
      if (tp3 >= tp2) tp3 = tp2 * 0.999;
    }

    // Reward de ayni sekilde yon bazli: LONG'da TP2 entry'nin USTUNDE, SHORT'ta
    // ALTINDA olmali - degilse (TP2 zaten gecilmis/yanlis yonde) setup reddedilir.
    const mainReward = bullish ? tp2 - entry : entry - tp2;
    if (mainReward <= 0) return null;
    const rr = mainReward / risk;
    if (rr < this.getMinRR()) return null;

    const reasons: string[] = [];
    reasons.push(`Yön: ${bullish ? 'Yükseliş (LONG)' : 'Düşüş (SHORT)'}`);
    if (htfBiasConfirmed) reasons.push('HTF Bias: Günlük + kısa vadeli trend uyumlu');
    reasons.push(`Range: ${range.lower.toFixed(4)} - ${range.upper.toFixed(4)} (üst sınır ${range.upperTests}x, alt sınır ${range.lowerTests}x test edildi)`);
    reasons.push(`Breakout Continuation teyidi: ${bullish ? 'range üst sınırı kapanışla kırıldı' : 'range alt sınırı kapanışla kırıldı'} ve bir sonraki günlük mum da aynı yönde range dışında kapandı (geri dönmedi)`);
    if (mssConfirmed) reasons.push('Market Structure Shift (BOS) onaylandı');
    const weeklyTrend = this.getTrend(weeklyCandles);
    if (weeklyTrend === trendDaily) reasons.push('Haftalık zaman dilimi de aynı yönü destekliyor');
    if (fundingRate !== null) {
      if (bullish && fundingRate < -0.05) reasons.push(`Funding rate aşırı negatif (${fundingRate.toFixed(3)}%)`);
      else if (!bullish && fundingRate > 0.05) reasons.push(`Funding rate aşırı pozitif (${fundingRate.toFixed(3)}%)`);
    }

    const strength: 'GUCLU' | 'ORTA' | 'RISKLI' =
      confirmedCount === 4 ? 'GUCLU' : confirmedCount === 3 ? 'ORTA' : 'RISKLI';
    const confidenceScore = confirmedCount * 25;

    return {
      direction, currentPrice: lastCandle.close, entry, entryZoneTop, entryZoneBottom, stop, tp1, tp2, tp3,
      rr: Math.round(rr * 100) / 100, reasons, confidenceScore,
      confirmedCount, strength, stillValid, distancePercent, patternType: 'BREAKOUT_CONTINUATION',
    };
  }

  // Day Trade (scanDayTrade) icin range bazli Breakout Continuation modeli calisir:
  // range siniri kapanisla kirilir, bir sonraki mumda da AYNI yonde range DISINDA
  // kapanirsa (geri donmezse) - kirilim YONUNDE islem. (Eskiden burada ayrica bir
  // Turtle Soup/fakeout modeli de vardi, kaldirildi - artik bu tek model kullaniliyor.)
  // Range 4 saatlik mumlardan, teyit 15dk mumlarla (day trade daha hizli hareket
  // ettigi icin). Trend filtresi, HTF bias ve confirmation sayaci buildSetup ile AYNI.
  private buildDayTradeSetup(
    h1Candles: Candle[],
    trend15m: 'UP' | 'DOWN' | 'FLAT',
    h4Candles: Candle[],
    m15Candles: Candle[],
    fundingRate: number | null,
    stageCounter?: DayTradeStageCounter,
  ): Setup | null {
    if (h1Candles.length < 60) return null;
    const trendMain = this.getTrend(h1Candles);
    if (trendMain === 'FLAT') return null;
    const direction: 'LONG' | 'SHORT' = trendMain === 'UP' ? 'LONG' : 'SHORT';
    const bullish = direction === 'LONG';

    const htfBiasConfirmed = trendMain === trend15m;

    // Range: son 15-20 adet 4 saatlik mumdan, en az 2'ser kez test edilmis bant
    const rangeCandles = h4Candles.slice(-20);
    const atrH4 = this.atr(rangeCandles);
    const range = this.findTestedRange(rangeCandles, atrH4);
    if (!range) return null;
    const rangeWidth = range.upper - range.lower;
    if (stageCounter) stageCounter.rangeFound++;

    // Son iki 15dk muma bakilir: breakoutCandle siniri kirar, confirmCandle onu teyit eder.
    if (m15Candles.length < 2) return null;
    const m = m15Candles.length;
    const breakoutCandle = m15Candles[m - 2];
    const confirmCandle = m15Candles[m - 1];

    // Breakout Continuation: breakoutCandle KAPANISLA yon tarafindaki siniri kirar
    // (bullish'te UST sinir), confirmCandle da AYNI yonde range DISINDA kapanir
    // (geri donmez) - gercek kirilim, kirilim yonunde devam.
    let breakoutContinuationConfirmed = false;
    if (bullish) {
      const brokeUpper = breakoutCandle.close > range.upper;
      const continuedOutside = confirmCandle.close > range.upper;
      if (brokeUpper && continuedOutside) breakoutContinuationConfirmed = true;
    } else {
      const brokeLower = breakoutCandle.close < range.lower;
      const continuedOutside = confirmCandle.close < range.lower;
      if (brokeLower && continuedOutside) breakoutContinuationConfirmed = true;
    }
    if (breakoutContinuationConfirmed && stageCounter) stageCounter.breakoutContinuationConfirmed++;
    if (!breakoutContinuationConfirmed) return null;
    const patternType: 'BREAKOUT_CONTINUATION' = 'BREAKOUT_CONTINUATION';

    const mssConfirmed = this.hasBOS(h1Candles, direction);

    // Esik 3'ten 2'ye dusuruldu, bkz. buildSetup'taki aciklama. Ikinci ve ucuncu
    // eleman (range bulundu, breakoutContinuationConfirmed) bu noktada zaten her
    // zaman true - yukarida return null ile garanti edildi.
    const confirmedCount = [htfBiasConfirmed, true, breakoutContinuationConfirmed, mssConfirmed].filter(Boolean).length;
    if (confirmedCount < 2) return null;
    if (stageCounter) stageCounter.confirmedCountPassed++;

    const entryZoneTop = Math.max(confirmCandle.open, confirmCandle.close);
    const entryZoneBottom = Math.min(confirmCandle.open, confirmCandle.close);
    const entry = confirmCandle.close;

    const lastCandle = confirmCandle;
    const stillValid = lastCandle.close <= entryZoneTop && lastCandle.close >= entryZoneBottom;
    const distancePercent = 0;

    // ATR tamponu: range 4 saatlik mumlardan kuruldugu icin buffer da AYNI
    // olcekten (4H ATR) hesaplanmali - 15dk ATR kullanmak buffer'i 4H range
    // sinirina gore anlamsiz derecede kucultuyor, stop mesafesi bazen fiyatin
    // %0.1'inin bile altina dusuyordu (bkz. WLFIUSDT). atrH4 zaten yukarida
    // range bulma icin hesaplanmisti (satir 605), burada tekrar kullanilir.
    const wickBuffer = atrH4 * 0.15;

    // Stop: kirilan range sinirinin hemen gerisi - fiyat range'e geri donerse
    // (sinir tekrar icine girerse) trade zaten gecersizdir
    let stop = bullish ? range.upper - wickBuffer : range.lower + wickBuffer;
    // R:R risk/reward yon bazli (signed) hesaplanir - bkz. buildSetup
    let risk = bullish ? entry - stop : stop - entry;
    if (risk <= 0) return null;
    // Minimum stop tabani: entry, range sinirini sadece bir tik gectiginde
    // (breakoutContinuationConfirmed icin bu yeterli) risk mesafesi wickBuffer'a
    // kadar collapse edebiliyordu - fiyatin %0.5'inden dar bir stop, day trade
    // icin bile gurultu ile tetiklenecek kadar siki demektir, taban zorlanir.
    const MIN_STOP_PCT = 0.005;
    const floorRisk = entry * MIN_STOP_PCT;
    if (risk < floorRisk) {
      risk = floorRisk;
      stop = bullish ? entry - floorRisk : entry + floorRisk;
    }

    // TP1: kirilim yonunde olculu hareket. Projeksiyon mesafesi min(atrH4*1.5, rangeWidth)
    // ile sinirlanir - rangeWidth 4H range'in tam genisligi (gunler suren bir yapi),
    // 15dk teyitli bir day trade'in gerceklesme suresine gore fazla genis bir hedef
    // olusturuyordu (bkz. WLFIUSDT TP3 ~%21). atrH4*1.5 day-trade olcegine daha
    // uygun, ama asiri oynak/yeni listelenen coinlerde (UTKUSDT, DUSDT gibi) 4H ATR'nin
    // kendisi de buyuk olabildigi icin min() ile capleniyor - yeni TP hicbir zaman
    // eski (rangeWidth) projeksiyonundan genis cikmaz.
    const tpDistance = Math.min(atrH4 * 1.5, rangeWidth);
    let tp1 = bullish ? range.upper + tpDistance : range.lower - tpDistance;
    // Mutlak ikinci tavan: asiri oynak/yeni listelenen coinlerde (DUSDT, ERAUSDT gibi)
    // atrH4*1.5 kendisi de entry'den %20-50 uzakta kalabiliyordu - bir day trade icin
    // gerceklesme suresine gore hala fazla genis. tp1 entry'den %6'nin otesine gecemez;
    // tp2/tp3 fallback'i tp1'e eklenerek hesaplandigi icin tp1'in caplenmesi zincirin
    // tamamini sinirlar (sadece tp2/tp3'u ayri caplemek yetersizdi - capsiz tp1, asagidaki
    // monotonluk kontrolu uzerinden tp2/tp3'u yine tavanin otesine itebiliyordu).
    const ABS_TP_CAP_PCT = 0.06;
    const maxAbsDistance = entry * ABS_TP_CAP_PCT;
    if (Math.abs(tp1 - entry) > maxAbsDistance) {
      tp1 = bullish ? entry + maxAbsDistance : entry - maxAbsDistance;
    }
    if (bullish ? tp1 <= entry : tp1 >= entry) return null;
    const swingIdx = bullish ? this.findSwingHighs(h4Candles, 2) : this.findSwingLows(h4Candles, 2);
    const structuralLevels: number[] = [];
    const sortedLevels = swingIdx
      .map((i) => (bullish ? h4Candles[i].high : h4Candles[i].low))
      .filter((lvl) => (bullish ? lvl > tp1 : lvl < tp1))
      .sort((a, b) => (bullish ? a - b : b - a));
    for (const lvl of sortedLevels) {
      const last = structuralLevels[structuralLevels.length - 1];
      if (last !== undefined && Math.abs(lvl - last) < atrH4 * 0.3) continue;
      structuralLevels.push(lvl);
      if (structuralLevels.length === 2) break;
    }
    let tp2 = structuralLevels[0] ?? (bullish ? tp1 + tpDistance : tp1 - tpDistance);
    let tp3 = structuralLevels[1] ?? (bullish ? tp2 + tpDistance : tp2 - tpDistance);
    if (structuralLevels[0] === undefined && Math.abs(tp2 - entry) > maxAbsDistance) {
      tp2 = bullish ? entry + maxAbsDistance : entry - maxAbsDistance;
    }
    if (structuralLevels[1] === undefined && Math.abs(tp3 - entry) > maxAbsDistance) {
      tp3 = bullish ? entry + maxAbsDistance : entry - maxAbsDistance;
    }
    // Monotonluk guvenlik agi (bkz. buildSwingSetup'taki HEIUSDT aciklamasi).
    if (bullish) {
      if (tp2 <= tp1) tp2 = tp1 * 1.001;
      if (tp3 <= tp2) tp3 = tp2 * 1.001;
    } else {
      if (tp2 >= tp1) tp2 = tp1 * 0.999;
      if (tp3 >= tp2) tp3 = tp2 * 0.999;
    }

    const mainReward = bullish ? tp2 - entry : entry - tp2;
    if (mainReward <= 0) return null;
    const rr = mainReward / risk;
    if (rr < this.getMinRR()) return null;
    if (stageCounter) stageCounter.rrPassed++;

    const reasons: string[] = [];
    reasons.push(`Yön: ${bullish ? 'Yükseliş (LONG)' : 'Düşüş (SHORT)'}`);
    if (htfBiasConfirmed) reasons.push('HTF Bias: 1H + 15dk trend uyumlu');
    reasons.push(`4H Range: ${range.lower.toFixed(4)} - ${range.upper.toFixed(4)} (üst sınır ${range.upperTests}x, alt sınır ${range.lowerTests}x test edildi)`);
    reasons.push(`Breakout Continuation teyidi (15dk): ${bullish ? 'range üst sınırı kapanışla kırıldı' : 'range alt sınırı kapanışla kırıldı'} ve bir sonraki 15dk mum da aynı yönde range dışında kapandı (geri dönmedi)`);
    if (mssConfirmed) reasons.push('Market Structure Shift (BOS) onaylandı');
    const h4Trend = this.getTrend(h4Candles);
    if (h4Trend === trendMain) reasons.push('4 saatlik zaman dilimi de aynı yönü destekliyor');
    if (fundingRate !== null) {
      if (bullish && fundingRate < -0.05) reasons.push(`Funding rate aşırı negatif (${fundingRate.toFixed(3)}%)`);
      else if (!bullish && fundingRate > 0.05) reasons.push(`Funding rate aşırı pozitif (${fundingRate.toFixed(3)}%)`);
    }

    const strength: 'GUCLU' | 'ORTA' | 'RISKLI' =
      confirmedCount === 4 ? 'GUCLU' : confirmedCount === 3 ? 'ORTA' : 'RISKLI';
    const confidenceScore = confirmedCount * 25;

    return {
      direction, currentPrice: lastCandle.close, entry, entryZoneTop, entryZoneBottom, stop, tp1, tp2, tp3,
      rr: Math.round(rr * 100) / 100, reasons, confidenceScore,
      confirmedCount, strength, stillValid, distancePercent, patternType,
    };
  }

  private async computeHistoricalWinRate(symbol: string, direction: 'LONG' | 'SHORT'): Promise<number | null> {
    const history = await this.prisma.historicalCandle.findMany({
      where: { symbol },
      orderBy: { timestamp: 'asc' },
    });
    if (history.length < 100) return null;
    const candles: Candle[] = history.map((h) => ({
      time: h.timestamp.getTime(), open: h.open, high: h.high, low: h.low, close: h.close, volume: h.volume ?? 0,
    }));
    const bullish = direction === 'LONG';
    let wins = 0;
    let total = 0;
    for (let i = 60; i < candles.length - 20; i++) {
      if (i % 20 === 0) {
        // Event loop'a nefes aldir — yoksa Node.js uzun sure bloke olup
        // BullMQ'nun kilit yenileme zamanlayicisini bile calistiramiyor
        await new Promise((resolve) => setImmediate(resolve));
      }
      const slice = candles.slice(0, i + 1);
      const trendSlice = this.getTrend(slice);
      if (trendSlice !== (bullish ? 'UP' : 'DOWN')) continue;
      const weeklySlice = this.toWeekly(slice);
      // 4H geçmiş verisi ayrı saklanmadığı için günlük trend, HTF Bias onayı yerine kullanılıyor.
      // buildSwingSetup kullanılıyor ki win rate, scanCrypto'nun kullandığı YENİ range +
      // Turtle Soup yöntemini yansıtsın (eski buildSetup artık sadece scanForex'te kullanılıyor)
      const setup = this.buildSwingSetup(slice, trendSlice, weeklySlice, null);
      if (!setup || setup.direction !== direction) continue;
      total++;
      const { entry, stop } = setup;
      const target = bullish ? entry + Math.abs(entry - stop) * 3 : entry - Math.abs(entry - stop) * 3;
      const future = candles.slice(i + 1, i + 21);
      let hitTarget = false, hitStop = false;
      for (const f of future) {
        if (bullish) {
          if (f.low <= stop) { hitStop = true; break; }
          if (f.high >= target) { hitTarget = true; break; }
        } else {
          if (f.high >= stop) { hitStop = true; break; }
          if (f.low <= target) { hitTarget = true; break; }
        }
      }
      if (hitTarget && !hitStop) wins++;
    }
    if (total < 5) return null;
    return Math.round((wins / total) * 100);
  }
  private async getCachedWinRate(symbol: string, direction: 'LONG' | 'SHORT'): Promise<number | null> {
    const cached = await this.prisma.winRateCache.findUnique({
      where: { symbol_direction: { symbol, direction: direction === 'LONG' ? 'BUY' : 'SELL' } },
    });
    return cached?.winRatePercent ?? null;
  }

  async refreshWinRateCache() {
    const cryptoSymbols = await this.prisma.historicalCandle.findMany({
      where: { assetType: 'CRYPTO' }, distinct: ['symbol'], select: { symbol: true },
    });
    const forexSymbols = await this.prisma.historicalCandle.findMany({
      where: { assetType: 'FOREX' }, distinct: ['symbol'], select: { symbol: true },
    });

    const allSymbols = [...cryptoSymbols, ...forexSymbols].map((s) => s.symbol);

    for (const symbol of allSymbols) {
      for (const direction of ['LONG', 'SHORT'] as const) {
        const winRate = await this.computeHistoricalWinRate(symbol, direction);
        const dbDirection = direction === 'LONG' ? 'BUY' : 'SELL';

        await this.prisma.winRateCache.upsert({
          where: { symbol_direction: { symbol, direction: dbDirection } },
          update: { winRatePercent: winRate, calculatedAt: new Date() },
          create: { symbol, direction: dbDirection, winRatePercent: winRate },
        });
      }
    }
  }

  private correlation(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    if (n < 2) return 0;
    const aSlice = a.slice(-n), bSlice = b.slice(-n);
    const avgA = aSlice.reduce((s, x) => s + x, 0) / n;
    const avgB = bSlice.reduce((s, x) => s + x, 0) / n;
    let num = 0, denA = 0, denB = 0;
    for (let i = 0; i < n; i++) {
      num += (aSlice[i] - avgA) * (bSlice[i] - avgB);
      denA += (aSlice[i] - avgA) ** 2;
      denB += (bSlice[i] - avgB) ** 2;
    }
    const den = Math.sqrt(denA * denB);
    return den === 0 ? 0 : num / den;
  }

  private async interpretWithAI(symbol: string, setup: any): Promise<string | null> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;

    const prompt = `Sen deneyimli bir teknik analiz uzmanısın. Aşağıdaki kural bazlı tarama sonucu için kısa, profesyonel bir senaryo yorumu yap. Yatırım tavsiyesi verme, sadece teknik durumu ve olası senaryoları özetle.

Enstrüman: ${symbol}
Yön: ${setup.direction}
Giriş: ${setup.entry}
Stop: ${setup.stop}
TP1: ${setup.tp1}, TP2: ${setup.tp2}, TP3: ${setup.tp3}
R:R: ${setup.rr}
Tarihsel başarı oranı: ${setup.winRatePercent ?? 'yetersiz veri'}%
Tespit edilen konfirmasyonlar: ${setup.reasons.join(', ')}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.content?.[0]?.text ?? null;
    } catch {
      return null;
    }
  }

  async scanCrypto() {
    const symbolList = await this.fetchTopBinanceSymbols(200);
    const symbols = symbolList.map((s) => ({ symbol: s }));

    const candidates: any[] = [];
    const returnsMap: Record<string, number[]> = {};

    for (const { symbol } of symbols) {
      try {
        const daily = await this.fetchBinanceDaily(symbol);
        const h4 = await this.fetchBinance4h(symbol);
        if (daily.length < 60 || h4.length < 30) continue;

        const weekly = this.toWeekly(daily);
        const fundingRate = await this.fetchBinanceFundingRate(symbol);
        const trend4h = this.getTrend(h4);
        const setup = this.buildSwingSetup(daily, trend4h, weekly, fundingRate);
        if (!setup) continue;

        const winRate = await this.getCachedWinRate(symbol, setup.direction);

        const closes = daily.slice(-60).map((c) => c.close);
        returnsMap[symbol] = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);

        candidates.push({ symbol, ...setup, winRatePercent: winRate, fundingRate });
      } catch { continue; }
      await new Promise((r) => setTimeout(r, 150));
    }

    candidates.sort((a, b) => b.confidenceScore - a.confidenceScore || (b.winRatePercent ?? 0) - (a.winRatePercent ?? 0));

    const selected: any[] = [];
    for (const c of candidates) {
      const tooCorrelated = selected.some((s) => this.correlation(returnsMap[s.symbol] ?? [], returnsMap[c.symbol] ?? []) > 0.8);
      if (!tooCorrelated) selected.push(c);
    }

    for (const s of selected) {
      s.aiCommentary = await this.interpretWithAI(s.symbol, s);
    }

    return selected;
  }

  async scanDayTrade() {
    const symbolList = await this.fetchTopBinanceSymbols(200);
    const symbols = symbolList.map((s) => ({ symbol: s }));

    const candidates: any[] = [];
    const returnsMap: Record<string, number[]> = {};
    // Funnel gozlemi: Breakout Continuation modeli eklendikten sonra hangi
    // asamada kac sembolun elendigini izlemek icin (bkz. scanDayTrade sonundaki log)
    const stageCounter: DayTradeStageCounter = {
      rangeFound: 0, breakoutContinuationConfirmed: 0,
      confirmedCountPassed: 0, rrPassed: 0,
    };
    let attempted = 0;

    for (const { symbol } of symbols) {
      try {
        const h1 = await this.fetchBinance1h(symbol);
        const m15 = await this.fetchBinance15m(symbol);
        const h4 = await this.fetchBinance4h(symbol);
        if (h1.length < 60 || m15.length < 30 || h4.length < 30) continue;

        attempted++;
        const fundingRate = await this.fetchBinanceFundingRate(symbol);
        const trend15m = this.getTrend(m15);
        // 1h: trend/BOS, 15dk: Breakout Continuation teyidi, 4h: range kaynagi
        const setup = this.buildDayTradeSetup(h1, trend15m, h4, m15, fundingRate, stageCounter);
        if (!setup) continue;

        const winRate = await this.getCachedWinRate(symbol, setup.direction);

        const closes = h1.slice(-60).map((c) => c.close);
        returnsMap[symbol] = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);

        candidates.push({ symbol, ...setup, winRatePercent: winRate, fundingRate, style: 'DAY' });
      } catch { continue; }
      await new Promise((r) => setTimeout(r, 150));
    }

    candidates.sort((a, b) => b.confidenceScore - a.confidenceScore || (b.winRatePercent ?? 0) - (a.winRatePercent ?? 0));

    const selected: any[] = [];
    for (const c of candidates) {
      const tooCorrelated = selected.some((s) => this.correlation(returnsMap[s.symbol] ?? [], returnsMap[c.symbol] ?? []) > 0.8);
      if (!tooCorrelated) selected.push(c);
    }

    console.log(
      `[scanDayTrade] denenen=${attempted} rangeBulundu=${stageCounter.rangeFound} ` +
      `breakoutContinuation=${stageCounter.breakoutContinuationConfirmed} ` +
      `confirmedCountGecti=${stageCounter.confirmedCountPassed} rrGecti(minRR=${this.getMinRR()})=${stageCounter.rrPassed} ` +
      `korelasyonSonrasi(selected)=${selected.length}`,
    );

    for (const s of selected) {
      s.aiCommentary = await this.interpretWithAI(s.symbol, s);
    }

    return selected;
  }

  async scanForex() {
    const symbols = await this.prisma.historicalCandle.findMany({
      where: { assetType: 'FOREX' }, distinct: ['symbol'], select: { symbol: true },
    });

    const candidates: any[] = [];
    const returnsMap: Record<string, number[]> = {};

    for (const { symbol } of symbols) {
      const yahooSymbol = YAHOO_MAP[symbol];
      if (!yahooSymbol) continue;

      try {
        const daily = await this.fetchYahoo(yahooSymbol, '6mo', '1d');
        const h4 = await this.fetchYahoo(yahooSymbol, '5d', '1h');
        if (daily.length < 60 || h4.length < 30) continue;

        const weekly = this.toWeekly(daily);
        const trend4h = this.getTrend(h4);
        const setup = this.buildSetup(daily, trend4h, weekly, null);
        if (!setup) continue;

        const winRate = await this.getCachedWinRate(symbol, setup.direction);

        const closes = daily.slice(-60).map((c) => c.close);
        returnsMap[symbol] = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);

        candidates.push({ symbol, ...setup, winRatePercent: winRate, fundingRate: null });
      } catch { continue; }
      await new Promise((r) => setTimeout(r, 150));
    }

    candidates.sort((a, b) => b.confidenceScore - a.confidenceScore || (b.winRatePercent ?? 0) - (a.winRatePercent ?? 0));

    const selected: any[] = [];
    for (const c of candidates) {
      const tooCorrelated = selected.some((s) => this.correlation(returnsMap[s.symbol] ?? [], returnsMap[c.symbol] ?? []) > 0.8);
      if (!tooCorrelated) selected.push(c);
      if (selected.length === 25) break;
    }

    for (const s of selected) {
      s.aiCommentary = await this.interpretWithAI(s.symbol, s);
    }

    return selected;
  }

  async getLivePrice(symbol: string): Promise<{ symbol: string; price: number | null }> {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      if (!res.ok) return { symbol, price: null };
      const data = await res.json();
      return { symbol, price: parseFloat(data.price) };
    } catch {
      return { symbol, price: null };
    }
  }

  async runFullScan() {
    const crypto = await this.scanCrypto();
    const results = { crypto, scannedAt: new Date() };
    await this.prisma.scanResult.create({ data: { results: results as any, style: 'SWING' } });
    return results;
  }

  async runDayTradeScan() {
    const crypto = await this.scanDayTrade();
    const results = { crypto, scannedAt: new Date() };
    await this.prisma.scanResult.create({ data: { results: results as any, style: 'DAY' } });
    return results;
  }

  async getLastScan(style: string = 'SWING') {
    return this.prisma.scanResult.findFirst({ where: { style }, orderBy: { createdAt: 'desc' } });
  }

  async scheduledScan() {
    // Bir onceki taramadaki AKTIF (stillValid) sembolleri al ki sadece
    // YENI aktif sinyallerde bildirim gonderelim, ayni sinyali her 15
    // dakikada tekrar tekrar bildirim olarak spam etmeyelim
    const previousScan = await this.prisma.scanResult.findFirst({ orderBy: { createdAt: 'desc' } });
    const previousActiveSymbols = new Set(
      ((previousScan?.results as any)?.crypto ?? [])
        .filter((c: any) => c.stillValid)
        .map((c: any) => c.symbol),
    );

    const results = await this.runFullScan();
    const activeSignals = results.crypto.filter((c: any) => c.stillValid);

    // "Yeni" degil, "su an acik takip kaydi olmayan" tum aktif sinyalleri takibe al
    // (onceki taramaya gore yeni degilse de, deploy oncesi zaten aktifse de kacirmasin)
    const openTracked = await this.prisma.trackedSignal.findMany({
      where: { status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      select: { symbol: true },
    });
    const trackedSymbols = new Set(openTracked.map((t) => t.symbol));
    // Bildirim icin: hem onceki taramada aktif OLMAYAN hem de zaten takipte OLMAYAN
    // sinyaller "yeni" sayilir - zaten takipte olan bir sembol fiyat sinirin cevresinde
    // gidip gelerek stillValid'i true/false arasinda gecis yapabilir, bu durumda tekrar
    // tekrar bildirim spam'i yapilmasin
    const newActiveSignals = activeSignals.filter(
      (c: any) => !previousActiveSymbols.has(c.symbol) && !trackedSymbols.has(c.symbol),
    );
    const signalsNeedingTracking = activeSignals.filter((c: any) => !trackedSymbols.has(c.symbol));
    if (signalsNeedingTracking.length > 0) {
      await this.createTrackedSignals(signalsNeedingTracking);
    }
    await this.updateTrackedSignals();

    if (newActiveSignals.length === 0) return;

    const admins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    });

    const symbolList = newActiveSignals.map((c: any) => `${c.symbol} (${c.direction})`).join(', ');
    const message = `${newActiveSignals.length} yeni aktif sinyal: ${symbolList}`;

    await this.notificationsService.createForManyUsers(
      admins.map((a) => a.id),
      {
        type: 'SYSTEM',
        title: 'AI Tarayıcı: Yeni Aktif Sinyal',
        message,
      },
    );
  }

  async scheduledDayTradeScan() {
    const previousScan = await this.prisma.scanResult.findFirst({
      where: { style: 'DAY' },
      orderBy: { createdAt: 'desc' },
    });
    const previousActiveSymbols = new Set(
      ((previousScan?.results as any)?.crypto ?? [])
        .filter((c: any) => c.stillValid)
        .map((c: any) => c.symbol),
    );

    const results = await this.runDayTradeScan();
    const activeSignals = results.crypto.filter((c: any) => c.stillValid);

    const openTracked = await this.prisma.trackedSignal.findMany({
      where: { style: 'DAY', status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      select: { symbol: true },
    });
    const trackedSymbols = new Set(openTracked.map((t) => t.symbol));
    const newActiveSignals = activeSignals.filter(
      (c: any) => !previousActiveSymbols.has(c.symbol) && !trackedSymbols.has(c.symbol),
    );
    const signalsNeedingTracking = activeSignals.filter((c: any) => !trackedSymbols.has(c.symbol));
    if (signalsNeedingTracking.length > 0) {
      await this.createTrackedSignals(signalsNeedingTracking, 'DAY');
    }
    // NOT: updateTrackedSignals() burada CAGIRILMIYOR - scheduledScan (swing) zaten
    // TUM acik kayitlari (stil farketmeksizin) her 15 dakikada guncelliyor

    if (newActiveSignals.length === 0) return;

    const admins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    });

    const symbolList = newActiveSignals.map((c: any) => `${c.symbol} (${c.direction})`).join(', ');
    const message = `${newActiveSignals.length} yeni aktif Day Trade sinyali: ${symbolList}`;

    await this.notificationsService.createForManyUsers(
      admins.map((a) => a.id),
      {
        type: 'SYSTEM',
        title: 'AI Tarayıcı: Yeni Day Trade Sinyali',
        message,
      },
    );
  }
  async createTrackedSignals(newActiveSignals: any[], style: string = 'SWING') {
    for (const s of newActiveSignals) {
      await this.prisma.trackedSignal.create({
        data: {
          symbol: s.symbol,
          direction: s.direction,
          entryZoneTop: s.entryZoneTop,
          entryZoneBottom: s.entryZoneBottom,
          stop: s.stop,
          tp1: s.tp1,
          tp2: s.tp2,
          tp3: s.tp3,
          rr: s.rr,
          strength: s.strength,
          style,
          status: 'WATCHING',
        },
      });
    }
  }

  async updateTrackedSignals() {
    const openSignals = await this.prisma.trackedSignal.findMany({
      where: { status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
    });

    for (const sig of openSignals) {
      const bullish = sig.direction === 'LONG';
      const live = await this.getLivePrice(sig.symbol);
      if (live.price === null) continue;
      const price = live.price;

      if (sig.status === 'WATCHING') {
        // Giris hic tetiklenmeden fiyat herhangi bir TP seviyesini gecmisse (ETCUSDT'de
        // gozlenen durum), bu setup artik gerceklestirilemez - normal mesafe/sure
        // esiklerini beklemeden hemen iptal edilir
        const passedAnyTp = bullish
          ? price >= Math.min(sig.tp1, sig.tp2, sig.tp3)
          : price <= Math.max(sig.tp1, sig.tp2, sig.tp3);
        if (passedAnyTp) {
          await this.prisma.trackedSignal.update({
            where: { id: sig.id },
            data: { status: 'INVALIDATED', closedAt: new Date() },
          });
          continue;
        }

        const entered = price <= sig.entryZoneTop && price >= sig.entryZoneBottom;
        if (entered) {
          await this.prisma.trackedSignal.update({
            where: { id: sig.id },
            data: { status: 'TRIGGERED', triggeredAt: new Date() },
          });
          continue;
        }
        const zoneMid = (sig.entryZoneTop + sig.entryZoneBottom) / 2;
        const distancePercent = Math.abs(price - zoneMid) / zoneMid * 100;
        const watchingAgeMs = Date.now() - sig.createdAt.getTime();
        const watchingExpiryMs = 3 * 24 * 60 * 60 * 1000;
        if (distancePercent > 8 || watchingAgeMs > watchingExpiryMs) {
          await this.prisma.trackedSignal.update({
            where: { id: sig.id },
            data: { status: 'INVALIDATED', closedAt: new Date() },
          });
        }
        continue;
      }

      // Tetiklenmis ama henuz stop/TP'ye ulasmamis, stile gore sure asimi:
      // SWING 10 gun, DAY 1 gun (day trade pozisyonlari uzun sure acik kalmamali)
      if (sig.triggeredAt) {
        const triggeredAgeMs = Date.now() - sig.triggeredAt.getTime();
        const expiryMs = sig.style === 'DAY' ? 1 * 24 * 60 * 60 * 1000 : 10 * 24 * 60 * 60 * 1000;
        if (triggeredAgeMs > expiryMs) {
          await this.prisma.trackedSignal.update({
            where: { id: sig.id },
            data: { status: 'EXPIRED', closedAt: new Date() },
          });
          continue;
        }
      }

      const hitStop = bullish ? price <= sig.stop : price >= sig.stop;
      if (hitStop) {
        // TP1 alindiktan sonra stop basabasa cekilmis oluyor (asagida) - fiyat
        // oraya donerse bu gercek bir kayip DEGIL, en son ulasilan TP'de kapanir
        const alreadyBankedTp = sig.status === 'HIT_TP1' || sig.status === 'HIT_TP2';
        await this.prisma.trackedSignal.update({
          where: { id: sig.id },
          data: alreadyBankedTp
            ? { closedAt: new Date() }
            : { status: 'HIT_STOP', closedAt: new Date() },
        });
        continue;
      }

      const hitTp3 = bullish ? price >= sig.tp3 : price <= sig.tp3;
      const hitTp2 = bullish ? price >= sig.tp2 : price <= sig.tp2;
      const hitTp1 = bullish ? price >= sig.tp1 : price <= sig.tp1;

      if (hitTp3) {
        await this.prisma.trackedSignal.update({
          where: { id: sig.id },
          data: { status: 'HIT_TP3', closedAt: new Date() },
        });
      } else if (hitTp2 && sig.status !== 'HIT_TP2') {
        await this.prisma.trackedSignal.update({
          where: { id: sig.id },
          data: { status: 'HIT_TP2' },
        });
      } else if (hitTp1 && sig.status === 'TRIGGERED') {
        // TP1 vuruldu: stop'u basabasa (giris bolgesi ortalamasina) cek -
        // artik bu islemde kayip riski yok, en kotu ihtimalle basabas kapanir
        const breakeven = (sig.entryZoneTop + sig.entryZoneBottom) / 2;
        await this.prisma.trackedSignal.update({
          where: { id: sig.id },
          data: { status: 'HIT_TP1', stop: breakeven },
        });
      }
    }
  }

  async getTrackedSignals(style: string = 'SWING') {
    const signals = await this.prisma.trackedSignal.findMany({
      where: { style },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const [activeCount, wins, losses] = await Promise.all([
      this.prisma.trackedSignal.count({
        where: { style, closedAt: null, status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      }),
      // Kazandi: kapanmis VE en az TP1'e ulasmis (TP1/TP2/TP3 hepsi gercek kar,
      // TP1 sonrasi stop basabasa cekildigi icin bu asamadan sonra kayip riski yok)
      this.prisma.trackedSignal.count({
        where: { style, closedAt: { not: null }, status: { in: ['HIT_TP1', 'HIT_TP2', 'HIT_TP3'] } },
      }),
      this.prisma.trackedSignal.count({ where: { style, status: 'HIT_STOP' } }),
    ]);
    const total = activeCount + wins + losses;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
    return {
      signals,
      stats: { total, wins, losses, winRate },
    };
  }


  async cleanupTrackedSignals() {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const deletedWatchingSwing = await this.prisma.trackedSignal.deleteMany({
      where: { style: 'SWING', status: 'WATCHING', createdAt: { lt: threeDaysAgo } },
    });
    const deletedWatchingDay = await this.prisma.trackedSignal.deleteMany({
      where: { style: 'DAY', status: 'WATCHING', createdAt: { lt: eightHoursAgo } },
    });
    const deletedExpired = await this.prisma.trackedSignal.deleteMany({
      where: { status: 'EXPIRED', closedAt: { lt: threeDaysAgo } },
    });
    return {
      deletedWatching: deletedWatchingSwing.count + deletedWatchingDay.count,
      deletedExpired: deletedExpired.count,
    };
  }
}
