import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../cache/redis-cache.service';

// ---------- CBBI (colintalkscrypto.com) — anahtarsız, limitsiz gözlemlendi ----------
// PiCycle/RUPL(NUPL)/RHODL/Puell/2YMA/Trolololo(Rainbow)/MVRV/ReserveRisk/Woobull
// alt-göstergelerini 0-1 normalize skor olarak + genel "Confidence" composite skorunu
// veriyor. "Piyasa Nabzı" composite kartının ve zone renklendirmesinin birincil
// kaynağı — bitcoin-data.com bütçesi tükense bile bu ayakta kalır.

export interface CbbiIndicatorScores {
  piCycle: number | null;
  rupl: number | null;
  rhodl: number | null;
  puell: number | null;
  twoYearMa: number | null;
  rainbow: number | null;
  mvrv: number | null;
  reserveRisk: number | null;
  woobull: number | null;
}

export interface CbbiData {
  price: number | null;
  confidence: number | null;
  indicators: CbbiIndicatorScores;
  updatedAt: string;
}

// ---------- bitcoin-data.com (BGeometrics) ham değerleri ----------
// ÖNEMLİ: Ücretsiz katman IP başına SAATTE 10 İSTEK ile sınırlı (bkz. 429
// RATE_LIMIT_HOUR_EXCEEDED). Bu yüzden aşağıdaki üç "batch" fonksiyonu ayrı
// cron saatlerinde çalışır (bkz. public-tools-scheduler.service.ts) — her biri
// tek başına 10'un altında kalır, aynı saatte asla iki batch birden tetiklenmez.
// Yeni bir alan eklerken bu bütçeyi unutma.

export interface CycleSnapshot {
  mvrvZscore: number | null;
  piCycle: { sma111: number | null; sma350x2: number | null; crossed: boolean } | null;
  puellMultiple: number | null;
  mayerMultiple: number | null;
  rhodlRatio: number | null;
  reserveRisk: number | null;
  goldenRatio: { price: number | null; sma350: number | null; x2618: number | null; x3236: number | null } | null;
  ma200Week: { price: number | null; ma: number | null } | null;
  updatedAt: string;
}

export interface CycleMacro {
  rainbow: { price: number | null; bandIndex: number | null; bandLabel: string | null } | null;
  terminalPrice: number | null;
  m2global: number | null;
  macroScore: number | null;
  ssr: number | null;
  seasonalityMonthly: Record<string, number> | null;
  updatedAt: string;
}

export interface ExchangeFlows {
  netflowBtc: number | null;
  reserveBtc: number | null;
  inflowUsd: number | null;
  outflowUsd: number | null;
  updatedAt: string;
}

export interface Ahr999Data {
  value: number | null;
  price: number | null;
  geoMean200d: number | null;
  updatedAt: string;
}

export interface TwoYearMaMultiplierData {
  value: number | null;
  price: number | null;
  ma730d: number | null;
  band5x: number | null;
  updatedAt: string;
}

export interface RsiHeatmapRow {
  symbol: string;
  rsi14: number;
}

export interface LongShortRow {
  symbol: string;
  longShortRatio: number;
}

export interface DcaResult {
  investedTotal: number;
  currentValue: number;
  roiPercent: number;
  btcAccumulated: number;
  purchaseCount: number;
  averageCost: number;
}

const CACHE_KEYS = {
  cbbi: 'tools:crypto:cycle:cbbi',
  snapshot: 'tools:crypto:cycle:snapshot',
  macro: 'tools:crypto:cycle:macro',
  exchangeFlows: 'tools:crypto:cycle:exchange-flows',
  ahr999: 'tools:crypto:cycle:ahr999',
  twoYearMa: 'tools:crypto:cycle:2y-ma',
  rsiHeatmap: 'tools:crypto:cycle:rsi-heatmap',
  longShort: 'tools:crypto:cycle:long-short',
  btcPriceSeries: 'tools:crypto:cycle:btc-price-series',
} as const;

const BD_BASE = 'https://api.bitcoin-data.com/v1';
const CBBI_URL = 'https://colintalkscrypto.com/cbbi/data/latest.json';
const GENESIS_MS = Date.UTC(2009, 0, 3);
const RSI_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT'];

@Injectable()
export class CycleIndicatorsService {
  private readonly logger = new Logger(CycleIndicatorsService.name);

  constructor(private readonly cache: RedisCacheService) {}

  private async safeFetchJson<T = any>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  // ---------- CBBI ----------

  async refreshCbbi(): Promise<void> {
    try {
      const raw = await this.safeFetchJson<Record<string, Record<string, number | null>>>(CBBI_URL);
      if (!raw) return;

      const lastEntry = (series: Record<string, number | null> | undefined): number | null => {
        if (!series) return null;
        const keys = Object.keys(series);
        if (keys.length === 0) return null;
        const lastKey = keys[keys.length - 1];
        const v = series[lastKey];
        return typeof v === 'number' ? v : null;
      };

      const payload: CbbiData = {
        price: lastEntry(raw.Price),
        confidence: lastEntry(raw.Confidence),
        indicators: {
          piCycle: lastEntry(raw.PiCycle),
          rupl: lastEntry(raw.RUPL),
          rhodl: lastEntry(raw.RHODL),
          puell: lastEntry(raw.Puell),
          twoYearMa: lastEntry(raw['2YMA']),
          rainbow: lastEntry(raw.Trolololo),
          mvrv: lastEntry(raw.MVRV),
          reserveRisk: lastEntry(raw.ReserveRisk),
          woobull: lastEntry(raw.Woobull),
        },
        updatedAt: new Date().toISOString(),
      };
      await this.cache.setJson(CACHE_KEYS.cbbi, payload, 3600 * 8);
    } catch (err) {
      this.logger.warn(`refreshCbbi failed: ${err}`);
    }
  }

  async getCbbi(): Promise<CbbiData | null> {
    return this.cache.getJson<CbbiData>(CACHE_KEYS.cbbi);
  }

  // ---------- bitcoin-data.com Batch 1: "core valuation" (8 istek) ----------

  async refreshSnapshot(): Promise<void> {
    try {
      const [mvrv, pi, puell, mayer, rhodl, reserve, golden, ma200w] = await Promise.all([
        this.safeFetchJson<any>(`${BD_BASE}/mvrv-zscore/last`),
        this.safeFetchJson<any>(`${BD_BASE}/pi-cycle/last`),
        this.safeFetchJson<any>(`${BD_BASE}/puell-multiple/last`),
        this.safeFetchJson<any>(`${BD_BASE}/mayer-multiple/last`),
        this.safeFetchJson<any>(`${BD_BASE}/rhodl-ratio/last`),
        this.safeFetchJson<any>(`${BD_BASE}/reserve-risk/last`),
        this.safeFetchJson<any>(`${BD_BASE}/golden-ratio-multiplier/last`),
        this.safeFetchJson<any>(`${BD_BASE}/200-week-ma/last`),
      ]);

      const payload: CycleSnapshot = {
        mvrvZscore: mvrv?.mvrvZscore ?? null,
        piCycle: pi
          ? { sma111: pi.piSma111 ?? null, sma350x2: pi.piSma350x2 ?? null, crossed: !!pi.piSignal }
          : null,
        puellMultiple: puell?.puellMultiple ?? null,
        mayerMultiple: mayer?.mayerMultiple ?? null,
        rhodlRatio: rhodl?.rhodlRatio ?? null,
        reserveRisk: reserve?.reserveRisk ?? null,
        goldenRatio: golden
          ? {
              price: golden.priceUsd ?? null,
              sma350: golden.sma350 ?? null,
              x2618: golden.x2618 ?? null,
              x3236: golden.x3236 ?? null,
            }
          : null,
        ma200Week: ma200w ? { price: ma200w.priceUsd ?? null, ma: ma200w.ma200w ?? null } : null,
        updatedAt: new Date().toISOString(),
      };
      await this.cache.setJson(CACHE_KEYS.snapshot, payload, 3600 * 30);
    } catch (err) {
      this.logger.warn(`refreshSnapshot failed: ${err}`);
    }
  }

  async getSnapshot(): Promise<CycleSnapshot | null> {
    return this.cache.getJson<CycleSnapshot>(CACHE_KEYS.snapshot);
  }

  // ---------- bitcoin-data.com Batch 2: "makro + bantlar" (6 istek) ----------

  async refreshMacro(): Promise<void> {
    try {
      // NOT: m2global/last bitcoin-data.com'un ücretli planında (403 INVALID_TOKEN,
      // subscription required) — istemiyoruz, boşa günlük kotayı (15 istek/gün) yer.
      const [rainbow, terminal, macro, ssr, seasonality] = await Promise.all([
        this.safeFetchJson<any>(`${BD_BASE}/rainbow-chart/last`),
        this.safeFetchJson<any>(`${BD_BASE}/terminal-price/last`),
        this.safeFetchJson<any>(`${BD_BASE}/bitcoin-macro-index/last`),
        this.safeFetchJson<any>(`${BD_BASE}/ssr/last`),
        this.safeFetchJson<any[]>(`${BD_BASE}/seasonality-monthly`),
      ]);

      const seasonalityMonthly = Array.isArray(seasonality)
        ? seasonality.reduce<Record<string, number>>((acc, row) => {
            if (row?.monthName != null && typeof row.avgReturn === 'number') acc[row.monthName] = row.avgReturn;
            return acc;
          }, {})
        : null;

      const payload: CycleMacro = {
        rainbow: rainbow
          ? { price: rainbow.priceUsd ?? null, bandIndex: rainbow.bandIndex ?? null, bandLabel: rainbow.bandLabel ?? null }
          : null,
        terminalPrice: terminal?.terminalPrice ?? null,
        m2global: null,
        macroScore: macro?.macroScore ?? null,
        ssr: ssr?.ssrStablecoin ?? null,
        seasonalityMonthly: seasonalityMonthly && Object.keys(seasonalityMonthly).length > 0 ? seasonalityMonthly : null,
        updatedAt: new Date().toISOString(),
      };
      await this.cache.setJson(CACHE_KEYS.macro, payload, 3600 * 30);
    } catch (err) {
      this.logger.warn(`refreshMacro failed: ${err}`);
    }
  }

  async getMacro(): Promise<CycleMacro | null> {
    return this.cache.getJson<CycleMacro>(CACHE_KEYS.macro);
  }

  // ---------- bitcoin-data.com Batch 3: borsa akışları + fiyat serisi (5 istek) ----------

  async refreshExchangeFlowsAndPriceSeries(): Promise<void> {
    try {
      // NOT: exchange-netflow-btc / exchange-reserve-btc / exchange-inflow-usd /
      // exchange-outflow-usd bitcoin-data.com'un ücretli planında (403 INVALID_TOKEN,
      // subscription required) — mevcut planla asla veri dönmeyecekler, o yüzden
      // artık çağırmıyoruz (boşa günlük kotayı, 15 istek/gün, tüketiyorlardı).
      // Kartlar abonelik alınana kadar "Veri yükleniyor" gösterecek.
      const priceSeries = await this.safeFetchJson<any[]>(`${BD_BASE}/btc-price`);

      const flows: ExchangeFlows = {
        netflowBtc: null,
        reserveBtc: null,
        inflowUsd: null,
        outflowUsd: null,
        updatedAt: new Date().toISOString(),
      };
      await this.cache.setJson(CACHE_KEYS.exchangeFlows, flows, 3600 * 30);

      if (Array.isArray(priceSeries) && priceSeries.length > 0) {
        const series = priceSeries
          .map((r) => ({ ts: parseInt(r.unixTs, 10), price: parseFloat(r.btcPrice) }))
          .filter((r) => Number.isFinite(r.ts) && Number.isFinite(r.price))
          .sort((a, b) => a.ts - b.ts);
        await this.cache.setJson(CACHE_KEYS.btcPriceSeries, series, 3600 * 30);
        await this.computeAhr999(series);
        await this.computeTwoYearMaMultiplier(series);
      }
    } catch (err) {
      this.logger.warn(`refreshExchangeFlowsAndPriceSeries failed: ${err}`);
    }
  }

  async getExchangeFlows(): Promise<ExchangeFlows | null> {
    return this.cache.getJson<ExchangeFlows>(CACHE_KEYS.exchangeFlows);
  }

  // ---------- AHR999 (kendi hesaplamamız) ----------
  // Yaygın kullanılan tanım: AHR999 = (fiyat/200günlük geometrik ortalama maliyet) ×
  // (fiyat/üstel büyüme değerlemesi). Üstel değerleme = 10^(5.84·log10(genesisten
  // gün sayısı) − 17.01). <0.45 dip/DCA fırsatı, 0.45-1.2 DCA bölgesi, >4 tepe.

  private async computeAhr999(series: { ts: number; price: number }[]): Promise<void> {
    try {
      if (series.length < 200) return;
      const last200 = series.slice(-200);
      const geoMean = Math.exp(last200.reduce((s, r) => s + Math.log(r.price), 0) / last200.length);
      const current = series[series.length - 1];
      const daysSinceGenesis = Math.max(1, Math.floor((current.ts * 1000 - GENESIS_MS) / 86_400_000));
      const exponentialValuation = Math.pow(10, 5.84 * Math.log10(daysSinceGenesis) - 17.01);
      const value = (current.price / geoMean) * (current.price / exponentialValuation);

      const payload: Ahr999Data = {
        value,
        price: current.price,
        geoMean200d: geoMean,
        updatedAt: new Date().toISOString(),
      };
      await this.cache.setJson(CACHE_KEYS.ahr999, payload, 3600 * 30);
    } catch (err) {
      this.logger.warn(`computeAhr999 failed: ${err}`);
    }
  }

  async getAhr999(): Promise<Ahr999Data | null> {
    return this.cache.getJson<Ahr999Data>(CACHE_KEYS.ahr999);
  }

  // ---------- 2 Yıllık MA Çarpanı (kendi hesaplamamız) ----------
  // 730 günlük aritmetik ortalama ve klasik 5x bandı (PlanB/Bobby Ong "Bitcoin
  // Investor Tool"). <1 ucuz, 1-3 nötr, 3-5 sıcak, >5 (5x bandına yakın/üstü) tepe.

  private async computeTwoYearMaMultiplier(series: { ts: number; price: number }[]): Promise<void> {
    try {
      if (series.length < 30) return;
      const window = series.slice(-730);
      const ma = window.reduce((s, r) => s + r.price, 0) / window.length;
      const current = series[series.length - 1];

      const payload: TwoYearMaMultiplierData = {
        value: current.price / ma,
        price: current.price,
        ma730d: ma,
        band5x: ma * 5,
        updatedAt: new Date().toISOString(),
      };
      await this.cache.setJson(CACHE_KEYS.twoYearMa, payload, 3600 * 30);
    } catch (err) {
      this.logger.warn(`computeTwoYearMaMultiplier failed: ${err}`);
    }
  }

  async getTwoYearMaMultiplier(): Promise<TwoYearMaMultiplierData | null> {
    return this.cache.getJson<TwoYearMaMultiplierData>(CACHE_KEYS.twoYearMa);
  }

  // ---------- RSI Heatmap (Binance klines, mevcut kod tabanındaki desenle aynı) ----------

  async refreshRsiHeatmap(): Promise<void> {
    try {
      const rows: RsiHeatmapRow[] = [];
      for (const symbol of RSI_SYMBOLS) {
        try {
          const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=15`);
          if (!res.ok) continue;
          const klines = await res.json();
          const closes = klines.map((k: any) => parseFloat(k[4]));
          const rsi = computeRsi14(closes);
          if (rsi != null) rows.push({ symbol, rsi14: rsi });
        } catch {
          continue;
        }
        await new Promise((r) => setTimeout(r, 120));
      }
      if (rows.length > 0) await this.cache.setJson(CACHE_KEYS.rsiHeatmap, rows, 900);
    } catch (err) {
      this.logger.warn(`refreshRsiHeatmap failed: ${err}`);
    }
  }

  async getRsiHeatmap(): Promise<RsiHeatmapRow[]> {
    return (await this.cache.getJson<RsiHeatmapRow[]>(CACHE_KEYS.rsiHeatmap)) ?? [];
  }

  // ---------- Long/Short Oranı (Binance futures, liquidation-zones ile aynı endpoint) ----------

  async refreshLongShortRatio(): Promise<void> {
    try {
      const rows: LongShortRow[] = [];
      for (const symbol of RSI_SYMBOLS) {
        try {
          const res = await fetch(
            `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`,
          );
          if (!res.ok) continue;
          const data = await res.json();
          const latest = data?.[data.length - 1];
          if (latest) rows.push({ symbol, longShortRatio: parseFloat(latest.longShortRatio) });
        } catch {
          continue;
        }
        await new Promise((r) => setTimeout(r, 120));
      }
      if (rows.length > 0) await this.cache.setJson(CACHE_KEYS.longShort, rows, 900);
    } catch (err) {
      this.logger.warn(`refreshLongShortRatio failed: ${err}`);
    }
  }

  async getLongShortRatio(): Promise<LongShortRow[]> {
    return (await this.cache.getJson<LongShortRow[]>(CACHE_KEYS.longShort)) ?? [];
  }

  // ---------- Piyasa Nabzı (composite — sadece CBBI'ye bağımlı, bitcoin-data.com
  // bütçesi tükense/kaynak çökse bile ayakta kalır) ----------

  async getMarketPulse(): Promise<{
    confidence: number | null;
    hotCount: number;
    totalCount: number;
    classification: string;
    updatedAt: string | null;
  }> {
    const cbbi = await this.getCbbi();
    if (!cbbi) {
      return { confidence: null, hotCount: 0, totalCount: 0, classification: 'Veri yok', updatedAt: null };
    }
    const scores = Object.values(cbbi.indicators).filter((v): v is number => typeof v === 'number');
    const hotCount = scores.filter((v) => v > 0.7).length;
    const confidence = cbbi.confidence;
    const classification =
      confidence == null
        ? 'Veri yok'
        : confidence > 0.75
          ? 'Aşırı Isınma (Tepe Bölgesi)'
          : confidence > 0.5
            ? 'Isınıyor'
            : confidence > 0.25
              ? 'Nötr'
              : 'Soğuk (Dip Bölgesi)';
    return { confidence, hotCount, totalCount: scores.length, classification, updatedAt: cbbi.updatedAt };
  }

  // ---------- DCA Hesaplayıcı (stateless, cache'lenmiş fiyat serisinden) ----------

  async computeDca(params: { amountUsd: number; frequencyDays: number; startDate: string }): Promise<DcaResult | null> {
    const series = await this.cache.getJson<{ ts: number; price: number }[]>(CACHE_KEYS.btcPriceSeries);
    if (!series || series.length === 0) return null;

    const startTs = new Date(params.startDate).getTime() / 1000;
    const frequencyMs = Math.max(1, params.frequencyDays) * 86_400;
    const amount = Math.max(0, params.amountUsd);

    let investedTotal = 0;
    let btcAccumulated = 0;
    let purchaseCount = 0;
    let nextPurchaseTs = startTs;
    let seriesIdx = 0;

    for (const point of series) {
      if (point.ts < nextPurchaseTs) continue;
      while (seriesIdx < series.length && series[seriesIdx].ts < point.ts) seriesIdx++;
      investedTotal += amount;
      btcAccumulated += amount / point.price;
      purchaseCount++;
      nextPurchaseTs = point.ts + frequencyMs;
    }

    if (purchaseCount === 0) return null;

    const currentPrice = series[series.length - 1].price;
    const currentValue = btcAccumulated * currentPrice;

    return {
      investedTotal,
      currentValue,
      roiPercent: investedTotal > 0 ? ((currentValue - investedTotal) / investedTotal) * 100 : 0,
      btcAccumulated,
      purchaseCount,
      averageCost: investedTotal / btcAccumulated,
    };
  }
}

function computeRsi14(closes: number[]): number | null {
  if (closes.length < 15) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
