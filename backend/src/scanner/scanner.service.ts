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

  private isInDayTradeKillzone(): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    // Ana pencere UTC 12:00-16:00 (TRT 15:00-19:00), ikincil UTC 07:00-09:00 (TRT 10:00-12:00)
    const mainWindow = utcHour >= 12 && utcHour < 16;
    const secondaryWindow = utcHour >= 7 && utcHour < 9;
    return mainWindow || secondaryWindow;
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

  private findFVGs(candles: Candle[]): { index: number; top: number; bottom: number; bullish: boolean }[] {
    const fvgs: { index: number; top: number; bottom: number; bullish: boolean }[] = [];
    for (let i = 2; i < candles.length; i++) {
      const c1 = candles[i - 2];
      const c3 = candles[i];
      if (c3.low > c1.high) fvgs.push({ index: i, top: c3.low, bottom: c1.high, bullish: true });
      else if (c3.high < c1.low) fvgs.push({ index: i, top: c1.low, bottom: c3.high, bullish: false });
    }
    return fvgs;
  }

  private findOrderBlocks(
    candles: Candle[],
    atrValue: number,
    bullish: boolean,
  ): { index: number; top: number; bottom: number }[] {
    const obs: { index: number; top: number; bottom: number }[] = [];
    for (let i = 1; i < candles.length - 1; i++) {
      const c = candles[i];
      const next = candles[i + 1];
      const isOppositeCandle = bullish ? c.close < c.open : c.close > c.open;
      if (!isOppositeCandle) continue;
      const nextRange = next.high - next.low;
      const nextIsDisplacement = nextRange > atrValue * 1.2;
      const nextMovesRightWay = bullish ? next.close > c.high : next.close < c.low;
      if (nextIsDisplacement && nextMovesRightWay) obs.push({ index: i, top: c.high, bottom: c.low });
    }
    return obs;
  }

  private isMitigated(candles: Candle[], fromIndex: number, top: number, bottom: number): boolean {
    // Su anki (henuz kapanmamis) mum HARIC tutulur — fiyatin tam su an bolgeye
    // girmis olmasi "mitigasyon" degil, tam olarak yakaladigimiz giris anidir
    for (let i = fromIndex + 1; i < candles.length - 1; i++) {
      if (candles[i].low <= top && candles[i].high >= bottom) return true;
    }
    return false;
  }

  private hasDisplacement(candles: Candle[], index: number, atrValue: number): boolean {
    if (index < 1) return false;
    const c = candles[index];
    const range = c.high - c.low;
    const avgVolume = candles.slice(Math.max(0, index - 20), index).reduce((s, x) => s + x.volume, 0) / 20;
    return range > atrValue * 1.3 && c.volume > avgVolume * 1.2;
  }

  private findLiquiditySweep(candles: Candle[], swingIndices: number[], isHigh: boolean): boolean {
    if (swingIndices.length === 0) return false;
    const lastSwingIdx = swingIndices[swingIndices.length - 1];
    const swingLevel = isHigh ? candles[lastSwingIdx].high : candles[lastSwingIdx].low;
    // Son 5 mumun herhangi birinde supurme olustuysa hala gecerli sayilir
    // (MSS supurmeden birkac mum sonra olustugu icin ikisinin ayni anda
    // gerceklesmesini beklemek yapisal olarak imkansiza yakindi)
    const recentCandles = candles.slice(-5);
    return recentCandles.some((c) => {
      if (isHigh) return c.high > swingLevel && c.close < swingLevel;
      return c.low < swingLevel && c.close > swingLevel;
    });
  }

  private rangesOverlap(aTop: number, aBottom: number, bTop: number, bBottom: number): boolean {
    return aBottom <= bTop && bBottom <= aTop;
  }

  private getOTEZone(
    candles: Candle[],
    swingHighs: number[],
    swingLows: number[],
    direction: 'LONG' | 'SHORT',
  ): { top: number; bottom: number } | null {
    if (direction === 'LONG') {
      if (swingLows.length === 0 || swingHighs.length === 0) return null;
      const lowIdx = swingLows[swingLows.length - 1];
      const highIdx = swingHighs[swingHighs.length - 1];
      if (highIdx <= lowIdx) return null;
      const legLow = candles[lowIdx].low;
      const legHigh = candles[highIdx].high;
      const range = legHigh - legLow;
      return { top: legHigh - range * 0.62, bottom: legHigh - range * 0.79 };
    } else {
      if (swingLows.length === 0 || swingHighs.length === 0) return null;
      const highIdx = swingHighs[swingHighs.length - 1];
      const lowIdx = swingLows[swingLows.length - 1];
      if (lowIdx <= highIdx) return null;
      const legHigh = candles[highIdx].high;
      const legLow = candles[lowIdx].low;
      const range = legHigh - legLow;
      return { top: legLow + range * 0.79, bottom: legLow + range * 0.62 };
    }
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

    // Konsept 1: HTF Bias
    const htfBiasConfirmed = trendDaily === trend4h;

    // Konsept 2: Liquidity Sweep
    const sweepConfirmed = bullish
      ? this.findLiquiditySweep(dailyCandles, swingLows, false)
      : this.findLiquiditySweep(dailyCandles, swingHighs, true);

    // Konsept 3: Market Structure Shift (MSS)
    const mssConfirmed = this.hasBOS(dailyCandles, direction);

    // Konsept 4: FVG veya Order Block Retest — fiyat hala bolgeye yakin olmali
    const proximityBuffer = atrValue * 1.5;
    const lastCloseForZone = dailyCandles[dailyCandles.length - 1].close;
    const isNearZone = (top: number, bottom: number) =>
      lastCloseForZone <= top + proximityBuffer && lastCloseForZone >= bottom - proximityBuffer;

    const fvgs = this.findFVGs(dailyCandles).filter((f) => f.bullish === bullish);
    const validFvgs = fvgs.filter((f) => !this.isMitigated(dailyCandles, f.index, f.top, f.bottom));
    const orderBlocks = this.findOrderBlocks(dailyCandles, atrValue, bullish);
    const validOBs = orderBlocks.filter((ob) => !this.isMitigated(dailyCandles, ob.index, ob.top, ob.bottom));

    let zone: { top: number; bottom: number; kind: string } | null = null;
    outer: for (const fvg of validFvgs.slice().reverse()) {
      for (const ob of validOBs.slice().reverse()) {
        if (this.rangesOverlap(fvg.top, fvg.bottom, ob.top, ob.bottom) && isNearZone(Math.min(fvg.top, ob.top), Math.max(fvg.bottom, ob.bottom))) {
          zone = { top: Math.min(fvg.top, ob.top), bottom: Math.max(fvg.bottom, ob.bottom), kind: 'FVG + Order Block (confluence)' };
          break outer;
        }
      }
    }
    if (!zone) {
      for (const f of validFvgs.slice().reverse()) {
        if (isNearZone(f.top, f.bottom)) { zone = { top: f.top, bottom: f.bottom, kind: 'Fair Value Gap' }; break; }
      }
    }
    if (!zone) {
      for (const ob of validOBs.slice().reverse()) {
        if (isNearZone(ob.top, ob.bottom)) { zone = { top: ob.top, bottom: ob.bottom, kind: 'Order Block' }; break; }
      }
    }
    const fvgObRetestConfirmed = zone !== null;

    const confirmedCount = [htfBiasConfirmed, sweepConfirmed, mssConfirmed, fvgObRetestConfirmed].filter(Boolean).length;
    if (confirmedCount < 2) return null;
    if (!zone) return null;

    const entryZoneTop = zone.top;
    const entryZoneBottom = zone.bottom;
    const entry = (entryZoneTop + entryZoneBottom) / 2;

    // stillValid: fiyat SU AN tam giris bolgesinin icinde mi (hemen girilebilir mi)
    const lastCandle = dailyCandles[dailyCandles.length - 1];
    const stillValid = lastCandle.close <= entryZoneTop && lastCandle.close >= entryZoneBottom;
    // distancePercent: fiyatin bolgenin en yakin kenarina yuzde kac uzaklikta oldugu (icindeyse 0)
    let distancePercent = 0;
    if (lastCandle.close > entryZoneTop) {
      distancePercent = ((lastCandle.close - entryZoneTop) / entryZoneTop) * 100;
    } else if (lastCandle.close < entryZoneBottom) {
      distancePercent = ((entryZoneBottom - lastCandle.close) / entryZoneBottom) * 100;
    }
    distancePercent = Math.round(distancePercent * 100) / 100;

    // Fiyat bolgeden %5'ten fazla uzaklassaymis artik anlamsiz, listeye hic girmesin
    if (!stillValid && distancePercent > 5) return null;

    const stop = bullish ? entryZoneBottom - atrValue * 0.3 : entryZoneTop + atrValue * 0.3;
    const risk = Math.abs(entry - stop);

    let mainTarget: number;
    if (bullish) {
      const nextSwing = swingHighs.length > 0 ? dailyCandles[swingHighs[swingHighs.length - 1]].high : null;
      const structural = nextSwing && nextSwing > entry ? nextSwing : entry + risk * 3;
      mainTarget = Math.max(structural, entry + risk * 2.5);
    } else {
      const nextSwing = swingLows.length > 0 ? dailyCandles[swingLows[swingLows.length - 1]].low : null;
      const structural = nextSwing && nextSwing < entry ? nextSwing : entry - risk * 3;
      mainTarget = Math.min(structural, entry - risk * 2.5);
    }
    const mainReward = Math.abs(mainTarget - entry);
    const rr = risk > 0 ? mainReward / risk : 0;

    const tp1 = bullish ? entry + risk * 1.5 : entry - risk * 1.5;
    const tp2 = mainTarget;
    const tp3 = bullish
      ? mainTarget + (mainTarget - entry) * 0.5
      : mainTarget - (entry - mainTarget) * 0.5;

    const reasons: string[] = [];
    reasons.push(`Yön: ${bullish ? 'Yükseliş (LONG)' : 'Düşüş (SHORT)'}`);
    if (htfBiasConfirmed) reasons.push('HTF Bias: Günlük + 4H trend uyumlu');
    if (sweepConfirmed) reasons.push('Liquidity Sweep tespit edildi');
    if (mssConfirmed) reasons.push('Market Structure Shift (MSS) onaylandı');
    if (fvgObRetestConfirmed) reasons.push(`Retest bölgesi: ${zone.kind}`);
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
      // 4H geçmiş verisi ayrı saklanmadığı için günlük trend, HTF Bias onayı yerine kullanılıyor
      const setup = this.buildSetup(slice, trendSlice, weeklySlice, null);
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
        const setup = this.buildSetup(daily, trend4h, weekly, fundingRate);
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
    if (!this.isInDayTradeKillzone()) return [];

    const symbolList = await this.fetchTopBinanceSymbols(200);
    const symbols = symbolList.map((s) => ({ symbol: s }));

    const candidates: any[] = [];
    const returnsMap: Record<string, number[]> = {};

    for (const { symbol } of symbols) {
      try {
        const h1 = await this.fetchBinance1h(symbol);
        const m15 = await this.fetchBinance15m(symbol);
        const h4 = await this.fetchBinance4h(symbol);
        if (h1.length < 60 || m15.length < 30 || h4.length < 30) continue;

        const fundingRate = await this.fetchBinanceFundingRate(symbol);
        const trend15m = this.getTrend(m15);
        // buildSetup jenerik: (ana yapı mumlari, kisa vadeli trend teyidi, daha yuksek TF trend teyidi, funding)
        // Swing'de: daily/4h/weekly - Day Trade'de: 1h/15m/4h
        const setup = this.buildSetup(h1, trend15m, h4, fundingRate);
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
    if (!this.isInDayTradeKillzone()) return;

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
        const entered = price <= sig.entryZoneTop && price >= sig.entryZoneBottom;
        if (entered) {
          await this.prisma.trackedSignal.update({
            where: { id: sig.id },
            data: { status: 'TRIGGERED', triggeredAt: new Date() },
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
        await this.prisma.trackedSignal.update({
          where: { id: sig.id },
          data: { status: 'HIT_STOP', closedAt: new Date() },
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
        await this.prisma.trackedSignal.update({
          where: { id: sig.id },
          data: { status: 'HIT_TP1' },
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
        where: { style, status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      }),
      this.prisma.trackedSignal.count({ where: { style, status: 'HIT_TP3' } }),
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
