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
  strength: 'GUCLU' | 'ORTA' | 'RISKLI';
  stillValid: boolean;
  distancePercent: number;
  trendLabel: 'PRO_TREND' | 'COUNTER_TREND';
  htfTrend1d: 'UP' | 'DOWN' | 'FLAT';
  htfTrend4h: 'UP' | 'DOWN' | 'FLAT';
  patternType: 'SUPPLY_DEMAND_ZONE';
}

// Base mum + sonrasindaki impulsif hareketten tespit edilen arz/talep bolgesi.
// baseIndex, zone'un kaynaklandigi mum dizisindeki (daily veya 4H) indeks -
// hem mitigasyon kontrolu hem de stop icin "supurulmemis fitil" aramasinda kullanilir.
interface Zone {
  type: 'SUPPLY' | 'DEMAND';
  top: number;
  bottom: number;
  baseIndex: number;
  formedAt: number;
}

// buildZoneSetup icin funnel gozlem sayaclari (scanDayTrade/scanCrypto loop'u
// sonunda console.log ile basilir) - hangi asamada kac sembolun elendigini izlemek icin
interface ZoneStageCounter {
  attempted: number;
  freshZoneFound: number;
  tpZonesSufficient: number;
  stopValid: number;
}

const YAHOO_MAP: Record<string, string> = {
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X', USDCHF: 'USDCHF=X',
  AUDUSD: 'AUDUSD=X', USDCAD: 'USDCAD=X', NZDUSD: 'NZDUSD=X', EURGBP: 'EURGBP=X',
  EURJPY: 'EURJPY=X', GBPJPY: 'GBPJPY=X', EURCHF: 'EURCHF=X', AUDJPY: 'AUDJPY=X',
  CADJPY: 'CADJPY=X', XAUUSD: 'GC=F', XAGUSD: 'SI=F', BRENT: 'BZ=F', WTI: 'CL=F',
  USDCNH: 'USDCNH=X', USDZAR: 'USDZAR=X', USDMXN: 'USDMXN=X',
};

// Base mumdan sonraki en fazla 3 mumluk pencerede kapanis bazli net yer
// degistirme ATR'nin kac kati olursa "impulsif" sayilir.
const ZONE_IMPULSE_ATR_MULT = 1.8;
// Stop icin "supurulmemis fitil" aranirken base mumdan geriye kac mum bakilir.
const ZONE_WICK_LOOKBACK = 10;
// Bulunan fitilin hemen otesine eklenen kucuk tampon (ATR DEGIL, sabit yuzde).
const ZONE_WICK_TICK_BUFFER_PCT = 0.001;
// Fitil bulunamazsa stop, zone sinirinin bu yuzde disina sabitlenir.
const ZONE_STOP_FALLBACK_PCT = 0.005;

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

  private async fetchBinance4h(symbol: string, limit = 200): Promise<Candle[]> {
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

  // Yahoo Finance native 4h interval sunmuyor - saatlik mumlar 4'erli gruplar
  // halinde katlanarak sentezlenir (toWeekly ile ayni desen)
  private toFourHour(hourly: Candle[]): Candle[] {
    const fourHour: Candle[] = [];
    for (let i = 0; i < hourly.length; i += 4) {
      const chunk = hourly.slice(i, i + 4);
      if (chunk.length === 0) continue;
      fourHour.push({
        time: chunk[0].time, open: chunk[0].open,
        high: Math.max(...chunk.map((c) => c.high)),
        low: Math.min(...chunk.map((c) => c.low)),
        close: chunk[chunk.length - 1].close,
        volume: chunk.reduce((s, c) => s + c.volume, 0),
      });
    }
    return fourHour;
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

  // HTF Bias icin: EMA50 vs EMA200. Ayni fonksiyon hem 1G hem 4S serisine
  // uygulanir (bkz. buildZoneSetup - trend1d/trend4h).
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

  // Arz/Talep bolgesi tespiti: base mum + hemen sonrasinda (en fazla 3 mumluk
  // pencerede) ATR'nin ZONE_IMPULSE_ATR_MULT katindan buyuk, coğunlukla ayni
  // yonlu kapanislarla olusan net bir yer degistirme varsa, base mum bir zone'dur.
  // Asagi impulsten once = supply (short icin), yukari impulsten once = demand
  // (long icin). Onceki gunluk/4S range ust-alt sinir mantigi YOK - sadece bu.
  private detectZones(candles: Candle[]): Zone[] {
    if (candles.length < 10) return [];
    const atrValue = this.atr(candles);
    if (!(atrValue > 0)) return [];

    const zones: Zone[] = [];
    let i = 1;
    while (i < candles.length - 1) {
      const base = candles[i];
      const window = candles.slice(i + 1, Math.min(i + 4, candles.length));
      if (window.length === 0) {
        i++;
        continue;
      }
      const displacement = window[window.length - 1].close - base.close;
      if (Math.abs(displacement) < atrValue * ZONE_IMPULSE_ATR_MULT) {
        i++;
        continue;
      }
      const bullishImpulse = displacement > 0;
      const sameDirCount = window.filter((c) => (bullishImpulse ? c.close > c.open : c.close < c.open)).length;
      if (sameDirCount < Math.ceil(window.length / 2)) {
        i++;
        continue;
      }

      zones.push({
        type: bullishImpulse ? 'DEMAND' : 'SUPPLY',
        top: base.high,
        bottom: base.low,
        baseIndex: i,
        formedAt: base.time,
      });
      // Bu impulsif hareketin icindeki sonraki mumlari tekrar base adayi olarak
      // degerlendirmeye almadan atla - "son GUCLU hareketin BASLADIGI mum" tekil
      // bir baslangic noktasidir, ayni hareketin ortasindaki her mum degil.
      i += window.length + 1;
    }
    return zones;
  }

  // Zone olustuktan SONRAKI herhangi bir mum, zone'un UZAK sinirini KAPANISLA
  // gecmisse (demand'da bottom altinda, supply'da top ustunde) zone tuketilmis
  // (mitigated) sayilir - artik gecerli bir giris bolgesi degildir. Sadece
  // dokunup icinde/ustunde kapanmak (henuz kirmadan) zone'u gecersiz kilmaz.
  private isZoneMitigated(zone: Zone, candles: Candle[]): boolean {
    for (let j = zone.baseIndex + 1; j < candles.length; j++) {
      const c = candles[j];
      if (zone.type === 'DEMAND' && c.close < zone.bottom) return true;
      if (zone.type === 'SUPPLY' && c.close > zone.top) return true;
    }
    return false;
  }

  // Stop: base mumun karsi tarafinda (LONG/demand'da ASAGIDA, SHORT/supply'da
  // YUKARIDA), zone olusmadan hemen once (ZONE_WICK_LOOKBACK mumluk pencerede)
  // zone sinirini asan ama o tarihten BUGUNE kadar hicbir mum tarafindan
  // "supurulmemis" (asilmamis) bir fitil varsa, stop o fitilin hemen otesine
  // konur. Boyle bir fitil yoksa stop zone sinirinin %0.5 disina sabitlenir.
  // ATR bazli tampon KULLANILMAZ - sadece sabit yuzdelik tampon.
  private computeZoneStop(zone: Zone, candles: Candle[], bullish: boolean): number {
    const lookbackStart = Math.max(0, zone.baseIndex - ZONE_WICK_LOOKBACK);
    let bestWick: number | null = null;

    for (let idx = lookbackStart; idx <= zone.baseIndex; idx++) {
      const c = candles[idx];
      if (bullish) {
        if (c.low >= zone.bottom) continue;
        const sweptLater = candles.slice(idx + 1).some((later) => later.low <= c.low);
        if (sweptLater) continue;
        if (bestWick === null || c.low < bestWick) bestWick = c.low;
      } else {
        if (c.high <= zone.top) continue;
        const sweptLater = candles.slice(idx + 1).some((later) => later.high >= c.high);
        if (sweptLater) continue;
        if (bestWick === null || c.high > bestWick) bestWick = c.high;
      }
    }

    if (bestWick !== null) {
      return bullish ? bestWick * (1 - ZONE_WICK_TICK_BUFFER_PCT) : bestWick * (1 + ZONE_WICK_TICK_BUFFER_PCT);
    }
    return bullish ? zone.bottom * (1 - ZONE_STOP_FALLBACK_PCT) : zone.top * (1 + ZONE_STOP_FALLBACK_PCT);
  }

  private computeTrendLabel(
    direction: 'LONG' | 'SHORT',
    trend1d: 'UP' | 'DOWN' | 'FLAT',
    trend4h: 'UP' | 'DOWN' | 'FLAT',
  ): 'PRO_TREND' | 'COUNTER_TREND' {
    // HTF bias: daha yuksek zaman dilimi (1G) esas alinir; 1G FLAT ise 4S'e
    // dusulur. Ikisi de FLAT ise net bir yon yok demektir - temkinli
    // varsayimla Counter-Trend etiketlenir (Pro-Trend iddia edilemez).
    const htfBias = trend1d !== 'FLAT' ? trend1d : trend4h;
    if (htfBias === 'FLAT') return 'COUNTER_TREND';
    const signalBias = direction === 'LONG' ? 'UP' : 'DOWN';
    return htfBias === signalBias ? 'PRO_TREND' : 'COUNTER_TREND';
  }

  // Supply/Demand Zone modeli - swing (gunluk mumlar) ve day-trade (4 saatlik
  // mumlar) icin AYNI fonksiyon kullanilir, tek fark disaridan verilen mum
  // serisinin zaman dilimi. Kripto ve Forex icin de aynen calisir.
  //
  // Akis: zone'lar tespit edilir (detectZones) -> tuketilmemis (fresh) olanlar
  // filtrelenir -> fiyata en yakin fresh zone sinyal adayi secilir (yon o
  // zone'un tipine gore belirlenir) -> stop supurulmemis fitil ya da %0.5
  // tampon ile hesaplanir -> TP1/2/3 karsit yondeki en yakin 3 fresh zone'un
  // yakin kenarindan alinir (yeterli karsit zone yoksa sinyal uretilmez, cunku
  // TrackedSignal semasi 3 TP'yi de zorunlu kilar) -> min R:R filtresi YOK,
  // hesaplanan R:R sadece bilgi amacli saklanir.
  private buildZoneSetup(
    candles: Candle[],
    trend1d: 'UP' | 'DOWN' | 'FLAT',
    trend4h: 'UP' | 'DOWN' | 'FLAT',
    fundingRate: number | null,
    stageCounter?: ZoneStageCounter,
  ): Setup | null {
    if (candles.length < 30) return null;
    if (stageCounter) stageCounter.attempted++;

    const lastCandle = candles[candles.length - 1];
    const currentPrice = lastCandle.close;

    const allZones = this.detectZones(candles);
    const freshZones = allZones.filter((z) => !this.isZoneMitigated(z, candles));
    if (freshZones.length === 0) return null;
    if (stageCounter) stageCounter.freshZoneFound++;

    // Fiyata (bolge orta noktasina gore) en yakin fresh zone, tur farketmeksizin,
    // sinyal adayi olarak secilir - yon o zone'un tipine gore belirlenir.
    let chosen: Zone | null = null;
    let bestDistance = Infinity;
    for (const z of freshZones) {
      const mid = (z.top + z.bottom) / 2;
      const distance = Math.abs(currentPrice - mid);
      if (distance < bestDistance) {
        bestDistance = distance;
        chosen = z;
      }
    }
    if (!chosen) return null;

    const direction: 'LONG' | 'SHORT' = chosen.type === 'DEMAND' ? 'LONG' : 'SHORT';
    const bullish = direction === 'LONG';

    const entryZoneTop = chosen.top;
    const entryZoneBottom = chosen.bottom;
    const entry = (entryZoneTop + entryZoneBottom) / 2;

    const stillValid = currentPrice <= entryZoneTop && currentPrice >= entryZoneBottom;
    const distancePercent = stillValid
      ? 0
      : Math.round((Math.abs(currentPrice - entry) / entry) * 10000) / 100;

    const stop = this.computeZoneStop(chosen, candles, bullish);
    const risk = bullish ? entry - stop : stop - entry;
    if (risk <= 0) return null;
    const wickBasedStop = bullish
      ? Math.abs(stop - entryZoneBottom) / entryZoneBottom > ZONE_WICK_TICK_BUFFER_PCT * 1.5
      : Math.abs(stop - entryZoneTop) / entryZoneTop > ZONE_WICK_TICK_BUFFER_PCT * 1.5;
    if (stageCounter) stageCounter.stopValid++;

    // TP1/2/3: karsit yondeki en yakin 3 FRESH zone, entry'nin islem
    // yonunde otesinde olanlar, yakinlik sirasiyla. Near-edge (LONG'da supply
    // zone'un ALT sinirini, SHORT'ta demand zone'un UST sinirini) TP fiyati olur.
    const oppositeType: 'SUPPLY' | 'DEMAND' = bullish ? 'SUPPLY' : 'DEMAND';
    const targetZones = freshZones
      .filter((z) => z.type === oppositeType)
      .filter((z) => (bullish ? z.bottom > entry : z.top < entry))
      .sort((a, b) => (bullish ? a.bottom - b.bottom : b.top - a.top));
    if (targetZones.length < 3) return null;
    if (stageCounter) stageCounter.tpZonesSufficient++;

    const tp1 = bullish ? targetZones[0].bottom : targetZones[0].top;
    const tp2 = bullish ? targetZones[1].bottom : targetZones[1].top;
    const tp3 = bullish ? targetZones[2].bottom : targetZones[2].top;

    const reward = bullish ? tp1 - entry : entry - tp1;
    if (reward <= 0) return null;
    // Min R:R filtresi kaldirildi (eski esik 1.5) - R:R sadece bilgi amacli
    // hesaplanip gosterilir, sinyal bundan bagimsiz kaydedilir.
    const rr = Math.round((reward / risk) * 100) / 100;

    const trendLabel = this.computeTrendLabel(direction, trend1d, trend4h);

    const reasons: string[] = [];
    reasons.push(`Yön: ${bullish ? 'Yükseliş (LONG)' : 'Düşüş (SHORT)'}`);
    reasons.push(
      `${bullish ? 'Talep (Demand)' : 'Arz (Supply)'} bölgesi: ${entryZoneBottom.toFixed(4)} - ${entryZoneTop.toFixed(4)} (son ${bullish ? 'yükseliş' : 'düşüş'} hareketinin başladığı base mumdan)`,
    );
    reasons.push(
      wickBasedStop
        ? 'Stop: base mumun karşı tarafındaki süpürülmemiş fitilin hemen ötesine yerleştirildi'
        : 'Stop: süpürülmemiş fitil bulunamadı, bölge sınırının %0.5 dışına sabitlendi',
    );
    reasons.push(
      `TP1/TP2/TP3, işlem yönündeki en yakın 3 karşıt bölgeden alındı (${targetZones.length >= 3 ? '3 karşıt bölge bulundu' : 'yetersiz karşıt bölge'})`,
    );
    reasons.push(
      trendLabel === 'PRO_TREND'
        ? `Pro-Trend: HTF (1G${trend1d !== 'FLAT' ? '' : '+4S'}) trend ile aynı yönde`
        : 'Counter-Trend: HTF trendin tersi yönde (filtrelenmedi, sadece etiketlendi)',
    );
    if (fundingRate !== null) {
      if (bullish && fundingRate < -0.05) reasons.push(`Funding rate aşırı negatif (${fundingRate.toFixed(3)}%)`);
      else if (!bullish && fundingRate > 0.05) reasons.push(`Funding rate aşırı pozitif (${fundingRate.toFixed(3)}%)`);
    }

    const strength: 'GUCLU' | 'ORTA' | 'RISKLI' =
      trendLabel === 'PRO_TREND' && wickBasedStop ? 'GUCLU' : trendLabel === 'PRO_TREND' || wickBasedStop ? 'ORTA' : 'RISKLI';
    const confidenceScore = strength === 'GUCLU' ? 100 : strength === 'ORTA' ? 60 : 30;

    return {
      direction, currentPrice, entry, entryZoneTop, entryZoneBottom, stop, tp1, tp2, tp3,
      rr, reasons, confidenceScore, strength, stillValid, distancePercent,
      trendLabel, htfTrend1d: trend1d, htfTrend4h: trend4h, patternType: 'SUPPLY_DEMAND_ZONE',
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
      // 4H gecmis verisi ayri saklanmadigi icin gunluk trend, hem 1G hem 4S
      // HTF referansi yerine kullanilir - win rate GUNCEL zone modelini yansitir.
      const trendSlice = this.getTrend(slice);
      const setup = this.buildZoneSetup(slice, trendSlice, trendSlice, null);
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
Yön: ${setup.direction} (${setup.trendLabel === 'PRO_TREND' ? 'Pro-Trend' : 'Counter-Trend'})
Giriş Bölgesi: ${setup.entryZoneBottom} - ${setup.entryZoneTop}
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

        const fundingRate = await this.fetchBinanceFundingRate(symbol);
        const trend1d = this.getTrend(daily);
        const trend4h = this.getTrend(h4);
        const setup = this.buildZoneSetup(daily, trend1d, trend4h, fundingRate);
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
    const stageCounter: ZoneStageCounter = { attempted: 0, freshZoneFound: 0, tpZonesSufficient: 0, stopValid: 0 };

    for (const { symbol } of symbols) {
      try {
        const h4 = await this.fetchBinance4h(symbol);
        const daily = await this.fetchBinanceDaily(symbol);
        if (h4.length < 30 || daily.length < 30) continue;

        const fundingRate = await this.fetchBinanceFundingRate(symbol);
        const trend1d = this.getTrend(daily);
        const trend4h = this.getTrend(h4);
        const setup = this.buildZoneSetup(h4, trend1d, trend4h, fundingRate, stageCounter);
        if (!setup) continue;

        const winRate = await this.getCachedWinRate(symbol, setup.direction);

        const closes = h4.slice(-60).map((c) => c.close);
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
      `[scanDayTrade] denenen=${stageCounter.attempted} freshZoneBulundu=${stageCounter.freshZoneFound} ` +
      `stopHesaplandi=${stageCounter.stopValid} yeterliTpZone=${stageCounter.tpZonesSufficient} ` +
      `korelasyonSonrasi(selected)=${selected.length}`,
    );

    for (const s of selected) {
      s.aiCommentary = await this.interpretWithAI(s.symbol, s);
    }

    return selected;
  }

  // Forex Swing: kripto'daki scanCrypto ile ayni Supply/Demand Zone modelini
  // (buildZoneSetup) kullanir, sadece veri kaynagi Binance yerine Yahoo Finance.
  // Sembol listesi dogrudan YAHOO_MAP'ten alinir (forex majorleri + emtia).
  async scanForexSwing() {
    const symbols = Object.keys(YAHOO_MAP);

    const candidates: any[] = [];
    const returnsMap: Record<string, number[]> = {};

    for (const symbol of symbols) {
      const yahooSymbol = YAHOO_MAP[symbol];

      try {
        const daily = await this.fetchYahoo(yahooSymbol, '2y', '1d');
        const hourly = await this.fetchYahoo(yahooSymbol, '1mo', '1h');
        const h4 = this.toFourHour(hourly);
        if (daily.length < 60 || h4.length < 30) continue;

        const trend1d = this.getTrend(daily);
        const trend4h = this.getTrend(h4);
        const setup = this.buildZoneSetup(daily, trend1d, trend4h, null);
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

  // Forex Day Trade: scanDayTrade ile ayni Supply/Demand Zone modeli
  // (buildZoneSetup), Yahoo Finance saatlik veriyle. Yahoo native 4h sunmadigi
  // icin 4H, saatlik mumlardan toFourHour() ile sentezlenir.
  async scanForexDayTrade() {
    const symbols = Object.keys(YAHOO_MAP);

    const candidates: any[] = [];
    const returnsMap: Record<string, number[]> = {};
    const stageCounter: ZoneStageCounter = { attempted: 0, freshZoneFound: 0, tpZonesSufficient: 0, stopValid: 0 };

    for (const symbol of symbols) {
      const yahooSymbol = YAHOO_MAP[symbol];

      try {
        const hourly = await this.fetchYahoo(yahooSymbol, '1mo', '1h');
        const daily = await this.fetchYahoo(yahooSymbol, '2y', '1d');
        const h4 = this.toFourHour(hourly);
        if (h4.length < 30 || daily.length < 30) continue;

        const trend1d = this.getTrend(daily);
        const trend4h = this.getTrend(h4);
        const setup = this.buildZoneSetup(h4, trend1d, trend4h, null, stageCounter);
        if (!setup) continue;

        const winRate = await this.getCachedWinRate(symbol, setup.direction);

        const closes = h4.slice(-60).map((c) => c.close);
        returnsMap[symbol] = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);

        candidates.push({ symbol, ...setup, winRatePercent: winRate, fundingRate: null, style: 'DAY' });
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

    console.log(
      `[scanForexDayTrade] denenen=${stageCounter.attempted} freshZoneBulundu=${stageCounter.freshZoneFound} ` +
      `stopHesaplandi=${stageCounter.stopValid} yeterliTpZone=${stageCounter.tpZonesSufficient} ` +
      `korelasyonSonrasi(selected)=${selected.length}`,
    );

    for (const s of selected) {
      s.aiCommentary = await this.interpretWithAI(s.symbol, s);
    }

    return selected;
  }

  async getLivePrice(symbol: string, market: string = 'CRYPTO'): Promise<{ symbol: string; price: number | null }> {
    if (market === 'FOREX') return this.getLiveForexPrice(symbol);
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      if (!res.ok) return { symbol, price: null };
      const data = await res.json();
      return { symbol, price: parseFloat(data.price) };
    } catch {
      return { symbol, price: null };
    }
  }

  // Yahoo Finance'in Binance'inki gibi hafif bir "guncel fiyat" ticker endpoint'i
  // yok - en son 1 dakikalik mumun kapanisi canli fiyat yerine kullanilir.
  async getLiveForexPrice(symbol: string): Promise<{ symbol: string; price: number | null }> {
    const yahooSymbol = YAHOO_MAP[symbol];
    if (!yahooSymbol) return { symbol, price: null };
    try {
      const candles = await this.fetchYahoo(yahooSymbol, '1d', '1m');
      if (candles.length === 0) return { symbol, price: null };
      return { symbol, price: candles[candles.length - 1].close };
    } catch {
      return { symbol, price: null };
    }
  }

  async runFullScan() {
    const crypto = await this.scanCrypto();
    const results = { crypto, scannedAt: new Date() };
    await this.prisma.scanResult.create({ data: { results: results as any, style: 'SWING', market: 'CRYPTO' } });
    return results;
  }

  async runDayTradeScan() {
    const crypto = await this.scanDayTrade();
    const results = { crypto, scannedAt: new Date() };
    await this.prisma.scanResult.create({ data: { results: results as any, style: 'DAY', market: 'CRYPTO' } });
    return results;
  }

  async runForexSwingScan() {
    const crypto = await this.scanForexSwing();
    const results = { crypto, scannedAt: new Date() };
    await this.prisma.scanResult.create({ data: { results: results as any, style: 'SWING', market: 'FOREX' } });
    return results;
  }

  async runForexDayTradeScan() {
    const crypto = await this.scanForexDayTrade();
    const results = { crypto, scannedAt: new Date() };
    await this.prisma.scanResult.create({ data: { results: results as any, style: 'DAY', market: 'FOREX' } });
    return results;
  }

  async getLastScan(style: string = 'SWING', market: string = 'CRYPTO') {
    return this.prisma.scanResult.findFirst({ where: { style, market: market as any }, orderBy: { createdAt: 'desc' } });
  }

  async scheduledScan() {
    // Bir onceki taramadaki AKTIF (stillValid) sembolleri al ki sadece
    // YENI aktif sinyallerde bildirim gonderelim, ayni sinyali her 15
    // dakikada tekrar tekrar bildirim olarak spam etmeyelim
    const previousScan = await this.prisma.scanResult.findFirst({
      where: { style: 'SWING', market: 'CRYPTO' },
      orderBy: { createdAt: 'desc' },
    });
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
      where: { market: 'CRYPTO', status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
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
      await this.createTrackedSignals(signalsNeedingTracking, 'SWING', 'CRYPTO');
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
      where: { style: 'DAY', market: 'CRYPTO' },
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
      where: { style: 'DAY', market: 'CRYPTO', status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      select: { symbol: true },
    });
    const trackedSymbols = new Set(openTracked.map((t) => t.symbol));
    const newActiveSignals = activeSignals.filter(
      (c: any) => !previousActiveSymbols.has(c.symbol) && !trackedSymbols.has(c.symbol),
    );
    const signalsNeedingTracking = activeSignals.filter((c: any) => !trackedSymbols.has(c.symbol));
    if (signalsNeedingTracking.length > 0) {
      await this.createTrackedSignals(signalsNeedingTracking, 'DAY', 'CRYPTO');
    }
    // NOT: updateTrackedSignals() burada CAGIRILMIYOR - scheduledScan (swing) zaten
    // TUM acik kayitlari (stil/market farketmeksizin) her 15 dakikada guncelliyor

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

  async scheduledForexSwingScan() {
    const previousScan = await this.prisma.scanResult.findFirst({
      where: { style: 'SWING', market: 'FOREX' },
      orderBy: { createdAt: 'desc' },
    });
    const previousActiveSymbols = new Set(
      ((previousScan?.results as any)?.crypto ?? [])
        .filter((c: any) => c.stillValid)
        .map((c: any) => c.symbol),
    );

    const results = await this.runForexSwingScan();
    const activeSignals = results.crypto.filter((c: any) => c.stillValid);

    const openTracked = await this.prisma.trackedSignal.findMany({
      where: { style: 'SWING', market: 'FOREX', status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      select: { symbol: true },
    });
    const trackedSymbols = new Set(openTracked.map((t) => t.symbol));
    const newActiveSignals = activeSignals.filter(
      (c: any) => !previousActiveSymbols.has(c.symbol) && !trackedSymbols.has(c.symbol),
    );
    const signalsNeedingTracking = activeSignals.filter((c: any) => !trackedSymbols.has(c.symbol));
    if (signalsNeedingTracking.length > 0) {
      await this.createTrackedSignals(signalsNeedingTracking, 'SWING', 'FOREX');
    }
    // NOT: updateTrackedSignals() burada CAGIRILMIYOR - scheduledScan (swing kripto)
    // zaten TUM acik kayitlari (stil/market farketmeksizin) her 15 dakikada guncelliyor

    if (newActiveSignals.length === 0) return;

    const admins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    });

    const symbolList = newActiveSignals.map((c: any) => `${c.symbol} (${c.direction})`).join(', ');
    const message = `${newActiveSignals.length} yeni aktif Forex sinyali: ${symbolList}`;

    await this.notificationsService.createForManyUsers(
      admins.map((a) => a.id),
      {
        type: 'SYSTEM',
        title: 'AI Tarayıcı: Yeni Forex Sinyali',
        message,
      },
    );
  }

  async scheduledForexDayTradeScan() {
    const previousScan = await this.prisma.scanResult.findFirst({
      where: { style: 'DAY', market: 'FOREX' },
      orderBy: { createdAt: 'desc' },
    });
    const previousActiveSymbols = new Set(
      ((previousScan?.results as any)?.crypto ?? [])
        .filter((c: any) => c.stillValid)
        .map((c: any) => c.symbol),
    );

    const results = await this.runForexDayTradeScan();
    const activeSignals = results.crypto.filter((c: any) => c.stillValid);

    const openTracked = await this.prisma.trackedSignal.findMany({
      where: { style: 'DAY', market: 'FOREX', status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      select: { symbol: true },
    });
    const trackedSymbols = new Set(openTracked.map((t) => t.symbol));
    const newActiveSignals = activeSignals.filter(
      (c: any) => !previousActiveSymbols.has(c.symbol) && !trackedSymbols.has(c.symbol),
    );
    const signalsNeedingTracking = activeSignals.filter((c: any) => !trackedSymbols.has(c.symbol));
    if (signalsNeedingTracking.length > 0) {
      await this.createTrackedSignals(signalsNeedingTracking, 'DAY', 'FOREX');
    }
    // NOT: updateTrackedSignals() burada CAGIRILMIYOR - scheduledScan (swing kripto)
    // zaten TUM acik kayitlari (stil/market farketmeksizin) her 15 dakikada guncelliyor

    if (newActiveSignals.length === 0) return;

    const admins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    });

    const symbolList = newActiveSignals.map((c: any) => `${c.symbol} (${c.direction})`).join(', ');
    const message = `${newActiveSignals.length} yeni aktif Forex Day Trade sinyali: ${symbolList}`;

    await this.notificationsService.createForManyUsers(
      admins.map((a) => a.id),
      {
        type: 'SYSTEM',
        title: 'AI Tarayıcı: Yeni Forex Day Trade Sinyali',
        message,
      },
    );
  }
  async createTrackedSignals(newActiveSignals: any[], style: string = 'SWING', market: string = 'CRYPTO') {
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
          trendLabel: s.trendLabel,
          style,
          market: market as any,
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
      const live = await this.getLivePrice(sig.symbol, sig.market);
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

  // Kazanc/kayip istatistiklerini hem genel toplam hem de Pro-Trend/Counter-Trend
  // olarak AYRI hesaplar - hangisinin daha iyi performans verdigi net gorulebilsin.
  // Filtreleme icin degil, sadece gruplama/karsilastirma icin (bkz. sema notu).
  private async computeSignalStats(style: string, market: string, trendLabel?: 'PRO_TREND' | 'COUNTER_TREND') {
    const baseWhere: any = { style, market: market as any };
    if (trendLabel) baseWhere.trendLabel = trendLabel;

    const [activeCount, wins, losses] = await Promise.all([
      this.prisma.trackedSignal.count({
        where: { ...baseWhere, closedAt: null, status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      }),
      // Kazandi: kapanmis VE en az TP1'e ulasmis (TP1/TP2/TP3 hepsi gercek kar,
      // TP1 sonrasi stop basabasa cekildigi icin bu asamadan sonra kayip riski yok)
      this.prisma.trackedSignal.count({
        where: { ...baseWhere, closedAt: { not: null }, status: { in: ['HIT_TP1', 'HIT_TP2', 'HIT_TP3'] } },
      }),
      this.prisma.trackedSignal.count({ where: { ...baseWhere, status: 'HIT_STOP' } }),
    ]);
    const total = activeCount + wins + losses;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
    return { total, wins, losses, winRate };
  }

  async getTrackedSignals(style: string = 'SWING', market: string = 'CRYPTO') {
    const signals = await this.prisma.trackedSignal.findMany({
      where: { style, market: market as any },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const [overall, proTrend, counterTrend] = await Promise.all([
      this.computeSignalStats(style, market),
      this.computeSignalStats(style, market, 'PRO_TREND'),
      this.computeSignalStats(style, market, 'COUNTER_TREND'),
    ]);
    return {
      signals,
      stats: { ...overall, proTrend, counterTrend },
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
