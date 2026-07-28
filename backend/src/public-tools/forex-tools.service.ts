import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../cache/redis-cache.service';

export interface ForexQuote {
  symbol: string;
  price: number;
  changePercent: number;
  /** Yahoo Finance chart API'den geliyor; gerçek zamanlı değil, ~15 dk gecikmeli. */
  delayed: true;
}

export interface GoldAndTlData {
  gramAltinTry: number;
  onsAltinUsd: number;
  usdTry: { price: number; changePercent: number };
  eurTry: { price: number; changePercent: number };
}

export interface CotRow {
  currency: string;
  leveragedLong: number;
  leveragedShort: number;
  netPosition: number;
  netPositionChange: number | null;
  reportDate: string;
}

export interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
}

const CACHE_KEY = 'tools:forex:quotes';
const GOLD_TL_CACHE_KEY = 'tools:forex:gold-tl';
const COT_CACHE_KEY = 'tools:forex:cot-report';
const CORRELATION_CACHE_KEY = 'tools:forex:correlation';

const GRAMS_PER_TROY_OUNCE = 31.1034768;

// CFTC Traders in Financial Futures (Combined) — resmi, ücretsiz, key gerektirmeyen Socrata API.
const CFTC_TFF_URL = 'https://publicreporting.cftc.gov/resource/yw9f-hn96.json';
const COT_CURRENCIES: Record<string, string> = {
  EUR: 'EURO FX - CHICAGO MERCANTILE EXCHANGE',
  GBP: 'BRITISH POUND - CHICAGO MERCANTILE EXCHANGE',
  JPY: 'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE',
  CHF: 'SWISS FRANC - CHICAGO MERCANTILE EXCHANGE',
  CAD: 'CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE',
  AUD: 'AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE',
};

// Yahoo Finance sembol eşlemesi — scanner.service.ts'deki YAHOO_MAP ile aynı desen,
// buraya en çok işlem gören 10 parite + DXY endeksi eklendi.
const FOREX_SYMBOLS: Record<string, string> = {
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'USDJPY=X',
  USDCHF: 'USDCHF=X',
  AUDUSD: 'AUDUSD=X',
  USDCAD: 'USDCAD=X',
  NZDUSD: 'NZDUSD=X',
  EURGBP: 'EURGBP=X',
  EURJPY: 'EURJPY=X',
  GBPJPY: 'GBPJPY=X',
  DXY: 'DX-Y.NYB', // ^DXY Yahoo'da veri döndürmüyor (boş/pasif sembol); gerçek çalışan ticker bu.
};

@Injectable()
export class ForexToolsService {
  private readonly logger = new Logger(ForexToolsService.name);

  constructor(private readonly cache: RedisCacheService) {}

  private async fetchYahooQuote(yahooSymbol: string): Promise<{ price: number; changePercent: number } | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=2d&interval=15m`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return null;
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      const meta = result?.meta;
      if (!meta) return null;
      const price = meta.regularMarketPrice;
      const prevClose = meta.previousClose ?? meta.chartPreviousClose;
      if (price == null || prevClose == null) return null;
      return { price, changePercent: ((price - prevClose) / prevClose) * 100 };
    } catch {
      return null;
    }
  }

  async refreshQuotes(): Promise<void> {
    const rows: ForexQuote[] = [];
    for (const [symbol, yahooSymbol] of Object.entries(FOREX_SYMBOLS)) {
      const quote = await this.fetchYahooQuote(yahooSymbol);
      if (quote) rows.push({ symbol, ...quote, delayed: true });
      await new Promise((r) => setTimeout(r, 150));
    }
    if (rows.length > 0) {
      await this.cache.setJson(CACHE_KEY, rows, 60 * 12);
    } else {
      this.logger.warn('refreshQuotes: no forex quotes fetched successfully');
    }
  }

  async getQuotes(): Promise<ForexQuote[]> {
    return (await this.cache.getJson<ForexQuote[]>(CACHE_KEY)) ?? [];
  }

  // ---------- Gram altın / ons altın / USDTRY / EURTRY ----------

  async refreshGoldAndTl(): Promise<void> {
    try {
      // XAUUSD=X Yahoo'da veri döndürmüyor; GC=F (altın vadeli) scanner.service.ts'de
      // de kullanılan çalışan alternatif — "ons altın" (USD) için bu kullanılıyor.
      const [gold, usdTry, eurTry] = await Promise.all([
        this.fetchYahooQuote('GC=F'),
        this.fetchYahooQuote('USDTRY=X'),
        this.fetchYahooQuote('EURTRY=X'),
      ]);
      if (!gold || !usdTry || !eurTry) return;

      const gramAltinTry = (gold.price / GRAMS_PER_TROY_OUNCE) * usdTry.price;
      const payload: GoldAndTlData = {
        gramAltinTry,
        onsAltinUsd: gold.price,
        usdTry,
        eurTry,
      };
      await this.cache.setJson(GOLD_TL_CACHE_KEY, payload, 60 * 12);
    } catch (err) {
      this.logger.warn(`refreshGoldAndTl failed: ${err}`);
    }
  }

  async getGoldAndTl(): Promise<GoldAndTlData | null> {
    return this.cache.getJson<GoldAndTlData>(GOLD_TL_CACHE_KEY);
  }

  // ---------- COT Raporu (CFTC, resmi & ücretsiz) ----------

  async refreshCotReport(): Promise<void> {
    try {
      const names = Object.values(COT_CURRENCIES);
      const inClause = names.map((n) => `'${n.replace(/'/g, "''")}'`).join(',');
      const where = `market_and_exchange_names in (${inClause})`;
      const url = `${CFTC_TFF_URL}?$where=${encodeURIComponent(where)}&$order=report_date_as_yyyy_mm_dd DESC&$limit=${names.length * 2}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data: any[] = await res.json();

      const byName = new Map<string, any[]>();
      for (const row of data) {
        const list = byName.get(row.market_and_exchange_names) ?? [];
        list.push(row);
        byName.set(row.market_and_exchange_names, list);
      }

      const rows: CotRow[] = [];
      for (const [currency, name] of Object.entries(COT_CURRENCIES)) {
        const reports = byName.get(name);
        if (!reports || reports.length === 0) continue;
        const latest = reports[0];
        const prev = reports[1];
        const long = parseFloat(latest.lev_money_positions_long);
        const short = parseFloat(latest.lev_money_positions_short);
        const net = long - short;
        const prevNet = prev
          ? parseFloat(prev.lev_money_positions_long) - parseFloat(prev.lev_money_positions_short)
          : null;
        rows.push({
          currency,
          leveragedLong: long,
          leveragedShort: short,
          netPosition: net,
          netPositionChange: prevNet != null ? net - prevNet : null,
          reportDate: latest.report_date_as_yyyy_mm_dd.slice(0, 10),
        });
      }
      if (rows.length > 0) await this.cache.setJson(COT_CACHE_KEY, rows, 3600 * 20);
    } catch (err) {
      this.logger.warn(`refreshCotReport failed: ${err}`);
    }
  }

  async getCotReport(): Promise<CotRow[]> {
    return (await this.cache.getJson<CotRow[]>(COT_CACHE_KEY)) ?? [];
  }

  // ---------- Korelasyon matrisi (mevcut forex fiyat verisinden, dış kaynak gerekmez) ----------

  async refreshCorrelationMatrix(): Promise<void> {
    try {
      const symbols = Object.keys(FOREX_SYMBOLS).filter((s) => s !== 'DXY');
      const returnsSeries: number[][] = [];

      for (const symbol of symbols) {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${FOREX_SYMBOLS[symbol]}?range=3mo&interval=1d`;
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (!res.ok) {
            returnsSeries.push([]);
            continue;
          }
          const data = await res.json();
          const closes: (number | null)[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
          const valid = closes.filter((c): c is number => c != null);
          const returns: number[] = [];
          for (let i = 1; i < valid.length; i++) {
            returns.push((valid[i] - valid[i - 1]) / valid[i - 1]);
          }
          returnsSeries.push(returns);
        } catch {
          returnsSeries.push([]);
        }
        await new Promise((r) => setTimeout(r, 150));
      }

      const minLen = Math.min(...returnsSeries.map((r) => r.length));
      if (!isFinite(minLen) || minLen < 5) return;
      const aligned = returnsSeries.map((r) => r.slice(r.length - minLen));

      const matrix = aligned.map((a) => aligned.map((b) => pearsonCorrelation(a, b)));
      const payload: CorrelationMatrix = { symbols, matrix };
      await this.cache.setJson(CORRELATION_CACHE_KEY, payload, 3600 * 26);
    } catch (err) {
      this.logger.warn(`refreshCorrelationMatrix failed: ${err}`);
    }
  }

  async getCorrelationMatrix(): Promise<CorrelationMatrix | null> {
    return this.cache.getJson<CorrelationMatrix>(CORRELATION_CACHE_KEY);
  }
}

function pearsonCorrelation(a: number[], b: number[]): number {
  const n = a.length;
  if (n === 0) return 0;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  if (varA === 0 || varB === 0) return 0;
  return cov / Math.sqrt(varA * varB);
}
