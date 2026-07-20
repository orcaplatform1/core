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
  entry: number;
  stop: number;
  tp1: number;
  tp2: number;
  tp3: number;
  rr: number;
  reasons: string[];
  confidenceScore: number;
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

  private async fetchBinanceDaily(symbol: string, limit = 250): Promise<Candle[]> {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((c: any) => ({
      time: c[0], open: parseFloat(c[1]), high: parseFloat(c[2]),
      low: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5]),
    }));
  }

  private async fetchBinance4h(symbol: string, limit = 120): Promise<Candle[]> {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((c: any) => ({
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
    for (let i = fromIndex + 1; i < candles.length; i++) {
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
    const lastCandle = candles[candles.length - 1];
    if (isHigh) return lastCandle.high > swingLevel && lastCandle.close < swingLevel;
    return lastCandle.low < swingLevel && lastCandle.close > swingLevel;
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
    if (trendDaily === 'FLAT' || trendDaily !== trend4h) return null;

    const direction: 'LONG' | 'SHORT' = trendDaily === 'UP' ? 'LONG' : 'SHORT';
    const atrValue = this.atr(dailyCandles);
    const bullish = direction === 'LONG';

    const fvgs = this.findFVGs(dailyCandles).filter((f) => f.bullish === bullish);
    const validFvgs = fvgs.filter(
      (f) => !this.isMitigated(dailyCandles, f.index, f.top, f.bottom) && this.hasDisplacement(dailyCandles, f.index, atrValue),
    );
    if (validFvgs.length === 0) return null;

    const orderBlocks = this.findOrderBlocks(dailyCandles, atrValue, bullish);
    const validOBs = orderBlocks.filter((ob) => !this.isMitigated(dailyCandles, ob.index, ob.top, ob.bottom));
    if (validOBs.length === 0) return null;

    let confluenceZone: { top: number; bottom: number } | null = null;
    for (const fvg of validFvgs.slice().reverse()) {
      for (const ob of validOBs.slice().reverse()) {
        if (this.rangesOverlap(fvg.top, fvg.bottom, ob.top, ob.bottom)) {
          confluenceZone = { top: Math.min(fvg.top, ob.top), bottom: Math.max(fvg.bottom, ob.bottom) };
          break;
        }
      }
      if (confluenceZone) break;
    }
    if (!confluenceZone) return null;

    const entry = (confluenceZone.top + confluenceZone.bottom) / 2;

    const swingHighs = this.findSwingHighs(dailyCandles);
    const swingLows = this.findSwingLows(dailyCandles);

    const ote = this.getOTEZone(dailyCandles, swingHighs, swingLows, direction);
    if (!ote) return null;
    const inOTE = entry <= ote.top && entry >= ote.bottom;
    if (!inOTE) return null;

    const stop = direction === 'LONG' ? confluenceZone.bottom - atrValue * 0.3 : confluenceZone.top + atrValue * 0.3;
    const risk = Math.abs(entry - stop);

    let mainTarget: number;
    if (direction === 'LONG') {
      const nextSwing = swingHighs.length > 0 ? dailyCandles[swingHighs[swingHighs.length - 1]].high : null;
      mainTarget = nextSwing && nextSwing > entry ? nextSwing : entry + risk * 3;
    } else {
      const nextSwing = swingLows.length > 0 ? dailyCandles[swingLows[swingLows.length - 1]].low : null;
      mainTarget = nextSwing && nextSwing < entry ? nextSwing : entry - risk * 3;
    }

    const mainReward = Math.abs(mainTarget - entry);
    const rr = risk > 0 ? mainReward / risk : 0;
    if (rr < 3) return null;

    const tp1 = direction === 'LONG' ? entry + risk * 1.5 : entry - risk * 1.5;
    const tp2 = mainTarget;
    const tp3 = direction === 'LONG'
      ? mainTarget + (mainTarget - entry) * 0.5
      : mainTarget - (entry - mainTarget) * 0.5;

    const reasons = [
      `Trend: ${direction === 'LONG' ? 'Yükseliş' : 'Düşüş'} (günlük + 4H uyumlu)`,
      'Order Block + Fair Value Gap çakışması (confluence)',
      'Giriş OTE bölgesinde (%62-79 Fibonacci)',
    ];

    let confidenceScore = 60;

    const sweepConfirmed = direction === 'LONG'
      ? this.findLiquiditySweep(dailyCandles, swingLows, false)
      : this.findLiquiditySweep(dailyCandles, swingHighs, true);
    if (sweepConfirmed) { reasons.push('Likidite süpürmesi tespit edildi'); confidenceScore += 8; }

    if (this.hasBOS(dailyCandles, direction)) {
      reasons.push('BOS/CHOCH (yapısal kırılım) teyidi var');
      confidenceScore += 12;
    }

    const weeklyTrend = this.getTrend(weeklyCandles);
    if (weeklyTrend === trendDaily) {
      reasons.push('Haftalık zaman dilimi de aynı yönü destekliyor');
      confidenceScore += 12;
    }

    if (fundingRate !== null) {
      if (direction === 'LONG' && fundingRate < -0.05) {
        reasons.push(`Funding rate aşırı negatif (${fundingRate.toFixed(3)}%) — short sıkışması potansiyeli`);
        confidenceScore += 8;
      } else if (direction === 'SHORT' && fundingRate > 0.05) {
        reasons.push(`Funding rate aşırı pozitif (${fundingRate.toFixed(3)}%) — long sıkışması potansiyeli`);
        confidenceScore += 8;
      }
    }

    return {
      direction, entry, stop, tp1, tp2, tp3,
      rr: Math.round(rr * 100) / 100, reasons, confidenceScore,
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

    let wins = 0;
    let total = 0;
    const bullish = direction === 'LONG';

    for (let i = 60; i < candles.length - 20; i++) {
      const slice = candles.slice(0, i + 1);
      const trend = this.getTrend(slice);
      if (trend !== (bullish ? 'UP' : 'DOWN')) continue;

      const atrValue = this.atr(slice);
      const fvgs = this.findFVGs(slice).filter((f) => f.bullish === bullish);
      const validFvgs = fvgs.filter((f) => !this.isMitigated(slice, f.index, f.top, f.bottom) && this.hasDisplacement(slice, f.index, atrValue));
      if (validFvgs.length === 0) continue;

      const obs = this.findOrderBlocks(slice, atrValue, bullish).filter((ob) => !this.isMitigated(slice, ob.index, ob.top, ob.bottom));
      if (obs.length === 0) continue;

      let zone: { top: number; bottom: number } | null = null;
      for (const fvg of validFvgs.slice().reverse()) {
        for (const ob of obs.slice().reverse()) {
          if (this.rangesOverlap(fvg.top, fvg.bottom, ob.top, ob.bottom)) {
            zone = { top: Math.min(fvg.top, ob.top), bottom: Math.max(fvg.bottom, ob.bottom) };
            break;
          }
        }
        if (zone) break;
      }
      if (!zone) continue;

      const entry = (zone.top + zone.bottom) / 2;

      const swingHighs = this.findSwingHighs(slice);
      const swingLows = this.findSwingLows(slice);
      const ote = this.getOTEZone(slice, swingHighs, swingLows, direction);
      if (!ote || entry > ote.top || entry < ote.bottom) continue;

      const stop = bullish ? zone.bottom - atrValue * 0.3 : zone.top + atrValue * 0.3;
      const risk = Math.abs(entry - stop);
      const target = bullish ? entry + risk * 3 : entry - risk * 3;

      total++;
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
          model: 'claude-sonnet-4-6',
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
    const symbols = await this.prisma.historicalCandle.findMany({
      where: { assetType: 'CRYPTO' }, distinct: ['symbol'], select: { symbol: true },
    });

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
      if (selected.length === 5) break;
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
      if (selected.length === 5) break;
    }

    for (const s of selected) {
      s.aiCommentary = await this.interpretWithAI(s.symbol, s);
    }

    return selected;
  }

  async runFullScan() {
    const [crypto, forex] = await Promise.all([this.scanCrypto(), this.scanForex()]);
    const results = { crypto, forex, scannedAt: new Date() };
    await this.prisma.scanResult.create({ data: { results: results as any } });
    return results;
  }

  async getLastScan() {
    return this.prisma.scanResult.findFirst({ orderBy: { createdAt: 'desc' } });
  }

  async scheduledScan() {
    const results = await this.runFullScan();
    const totalSignals = results.crypto.length + results.forex.length;

    if (totalSignals === 0) return;

    const admins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    });

    const cryptoSymbols = results.crypto.map((c: any) => c.symbol).join(', ');
    const forexSymbols = results.forex.map((f: any) => f.symbol).join(', ');

    let message = `Tarama tamamlandı, ${totalSignals} sinyal bulundu.`;
    if (cryptoSymbols) message += ` Kripto: ${cryptoSymbols}.`;
    if (forexSymbols) message += ` Forex: ${forexSymbols}.`;

    await this.notificationsService.createForManyUsers(
      admins.map((a) => a.id),
      {
        type: 'SYSTEM',
        title: 'AI Tarayıcı: Yeni Sinyal',
        message,
      },
    );
  }
}
