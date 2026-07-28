import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../cache/redis-cache.service';

export interface TickerRow {
  symbol: string;
  price: number;
  changePercent: number;
  quoteVolume: number;
  /** Son 24 saat, saatlik kapanış fiyatları — mini sparkline grafiği için. */
  sparkline?: number[];
}

export interface HeatmapCoin {
  symbol: string;
  name: string;
  marketCap: number;
  changePercent24h: number;
}

export interface FundingRow {
  symbol: string;
  fundingRatePercent: number;
}

export interface FearGreedData {
  value: number;
  classification: string;
  updatedAt: string;
}

export interface LiquidationZone {
  symbol: string;
  price: number;
  longShortRatio: number;
  openInterest: number;
  /** Yaygın kaldıraç oranlarına göre yaklaşık likidasyon fiyat seviyeleri (tahmini, kesin değil). */
  estimatedZones: { leverage: number; longLiqPrice: number; shortLiqPrice: number }[];
}

export interface TrendingCoin {
  symbol: string;
  name: string;
  marketCapRank: number | null;
}

export interface StablecoinFlowData {
  totalMarketCap: number;
  change24h: number;
  topStablecoins: { symbol: string; marketCap: number }[];
}

export interface AltcoinSeasonData {
  percentage: number;
  classification: 'Bitcoin Season' | 'Nötr' | 'Altcoin Season';
  outperformingCount: number;
  totalCount: number;
  updatedAt: string;
}

export interface EtfFlowRow {
  date: string;
  netFlow: number;
  cumulativeNetFlow: number;
  totalNetAssets: number;
}

const CACHE_KEYS = {
  ticker: 'tools:crypto:ticker',
  heatmap: 'tools:crypto:heatmap',
  dominance: 'tools:crypto:dominance',
  funding: 'tools:crypto:funding',
  fearGreed: 'tools:crypto:fear-greed',
  liqZones: 'tools:crypto:liq-zones',
  sparklines: 'tools:crypto:sparklines',
  trending: 'tools:crypto:trending',
  stablecoins: 'tools:crypto:stablecoins',
  altcoinSeason: 'tools:crypto:altcoin-season',
  etfFlowsBtc: 'tools:crypto:etf-flows:btc',
  etfFlowsEth: 'tools:crypto:etf-flows:eth',
};

const TOP_SYMBOL_COUNT = 40;
const LEVERAGE_TIERS = [5, 10, 25, 50];

@Injectable()
export class CryptoToolsService {
  private readonly logger = new Logger(CryptoToolsService.name);

  constructor(private readonly cache: RedisCacheService) {}

  // ---------- Ticker: Top10 / Hot10 / gainers / losers ----------

  private async fetchTickerRows(): Promise<TickerRow[]> {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    if (!res.ok) return [];
    const data = await res.json();
    return data
      .filter(
        (t: any) => t.symbol.endsWith('USDT') && !t.symbol.includes('UPUSDT') && !t.symbol.includes('DOWNUSDT'),
      )
      .map((t: any) => ({
        symbol: t.symbol,
        price: parseFloat(t.lastPrice),
        changePercent: parseFloat(t.priceChangePercent),
        quoteVolume: parseFloat(t.quoteVolume),
      }))
      .sort((a: TickerRow, b: TickerRow) => b.quoteVolume - a.quoteVolume)
      .slice(0, 200);
  }

  async refreshTicker(): Promise<void> {
    try {
      const rows = await this.fetchTickerRows();
      if (rows.length > 0) await this.cache.setJson(CACHE_KEYS.ticker, rows, 90);
    } catch (err) {
      this.logger.warn(`refreshTicker failed: ${err}`);
    }
  }

  // Ticker önbelleği henüz ısınmamışsa (ör. uygulama yeni açıldı, başka bir job'un
  // önbelleği doldurması beklenmeden) doğrudan taze veri çeker — cron sıralamasına
  // bağımlı olmaması için.
  private async getTopSymbols(limit: number): Promise<string[]> {
    const cached = await this.cache.getJson<TickerRow[]>(CACHE_KEYS.ticker);
    if (cached && cached.length > 0) return cached.slice(0, limit).map((t) => t.symbol);
    const fresh = await this.fetchTickerRows();
    return fresh.slice(0, limit).map((t) => t.symbol);
  }

  async getTopMovers() {
    const rows = (await this.cache.getJson<TickerRow[]>(CACHE_KEYS.ticker)) ?? [];
    const sparklines = (await this.cache.getJson<Record<string, number[]>>(CACHE_KEYS.sparklines)) ?? {};
    const withSparkline = (r: TickerRow): TickerRow => ({ ...r, sparkline: sparklines[r.symbol] });

    const byVolume = [...rows].sort((a, b) => b.quoteVolume - a.quoteVolume);
    const byAbsChange = [...rows].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    const gainers = [...rows].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
    const losers = [...rows].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
    return {
      top10: byVolume.slice(0, 10).map(withSparkline),
      hot10: byAbsChange.slice(0, 10).map(withSparkline),
      gainers: gainers.map(withSparkline),
      losers: losers.map(withSparkline),
    };
  }

  // Top10/Hot10/Kazanan/Kaybeden listelerinde gösterilen sembollerin son 24 saatlik
  // (saatlik) kapanış fiyatlarını çekip mini sparkline için önbelleğe alır.
  async refreshSparklines(): Promise<void> {
    try {
      let rows = (await this.cache.getJson<TickerRow[]>(CACHE_KEYS.ticker)) ?? [];
      if (rows.length === 0) rows = await this.fetchTickerRows();
      if (rows.length === 0) return;

      const byVolume = [...rows].sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, 10);
      const byAbsChange = [...rows].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 10);
      const gainers = [...rows].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
      const losers = [...rows].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
      const symbols = Array.from(
        new Set([...byVolume, ...byAbsChange, ...gainers, ...losers].map((r) => r.symbol)),
      );

      const result: Record<string, number[]> = {};
      for (const symbol of symbols) {
        try {
          const res = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=24`,
          );
          if (!res.ok) continue;
          const klines = await res.json();
          result[symbol] = klines.map((k: any) => parseFloat(k[4]));
        } catch {
          continue;
        }
        await new Promise((r) => setTimeout(r, 120));
      }
      await this.cache.setJson(CACHE_KEYS.sparklines, result, 300);
    } catch (err) {
      this.logger.warn(`refreshSparklines failed: ${err}`);
    }
  }

  // ---------- Heatmap + BTC dominance (CoinGecko) ----------

  async refreshHeatmapAndDominance(): Promise<void> {
    try {
      const [marketsRes, globalRes] = await Promise.all([
        fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1',
        ),
        fetch('https://api.coingecko.com/api/v3/global'),
      ]);

      if (marketsRes.ok) {
        const markets = await marketsRes.json();
        const coins: HeatmapCoin[] = markets.map((c: any) => ({
          symbol: (c.symbol as string).toUpperCase(),
          name: c.name,
          marketCap: c.market_cap ?? 0,
          changePercent24h: c.price_change_percentage_24h ?? 0,
        }));
        await this.cache.setJson(CACHE_KEYS.heatmap, coins, 360);
      }

      if (globalRes.ok) {
        const global = await globalRes.json();
        const btcDominance = global?.data?.market_cap_percentage?.btc ?? null;
        const ethDominance = global?.data?.market_cap_percentage?.eth ?? null;
        await this.cache.setJson(CACHE_KEYS.dominance, { btcDominance, ethDominance }, 360);
      }
    } catch (err) {
      this.logger.warn(`refreshHeatmapAndDominance failed: ${err}`);
    }
  }

  async getHeatmap(): Promise<HeatmapCoin[]> {
    return (await this.cache.getJson<HeatmapCoin[]>(CACHE_KEYS.heatmap)) ?? [];
  }

  async getDominance(): Promise<{ btcDominance: number | null; ethDominance: number | null }> {
    return (
      (await this.cache.getJson(CACHE_KEYS.dominance)) ?? { btcDominance: null, ethDominance: null }
    );
  }

  // ---------- Funding rates (bulk, Binance Futures) ----------

  async refreshFundingRates(): Promise<void> {
    try {
      const res = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex');
      if (!res.ok) return;
      const data = await res.json();
      const topSymbols = new Set(await this.getTopSymbols(TOP_SYMBOL_COUNT));
      const rows: FundingRow[] = data
        .filter((d: any) => topSymbols.size === 0 || topSymbols.has(d.symbol))
        .map((d: any) => ({
          symbol: d.symbol,
          fundingRatePercent: parseFloat(d.lastFundingRate) * 100,
        }))
        .sort((a: FundingRow, b: FundingRow) => Math.abs(b.fundingRatePercent) - Math.abs(a.fundingRatePercent));
      await this.cache.setJson(CACHE_KEYS.funding, rows, 360);
    } catch (err) {
      this.logger.warn(`refreshFundingRates failed: ${err}`);
    }
  }

  async getFundingRates(): Promise<FundingRow[]> {
    return (await this.cache.getJson<FundingRow[]>(CACHE_KEYS.funding)) ?? [];
  }

  // ---------- Fear & Greed Index ----------

  async refreshFearGreed(): Promise<void> {
    try {
      const res = await fetch('https://api.alternative.me/fng/?limit=1');
      if (!res.ok) return;
      const data = await res.json();
      const entry = data?.data?.[0];
      if (!entry) return;
      const payload: FearGreedData = {
        value: parseInt(entry.value, 10),
        classification: entry.value_classification,
        updatedAt: new Date(parseInt(entry.timestamp, 10) * 1000).toISOString(),
      };
      await this.cache.setJson(CACHE_KEYS.fearGreed, payload, 3600 * 6);
    } catch (err) {
      this.logger.warn(`refreshFearGreed failed: ${err}`);
    }
  }

  async getFearGreed(): Promise<FearGreedData | null> {
    return this.cache.getJson<FearGreedData>(CACHE_KEYS.fearGreed);
  }

  // ---------- Estimated liquidation zones (heuristic, NOT real liquidation data) ----------

  async refreshEstimatedLiquidationZones(): Promise<void> {
    try {
      const topSymbols = await this.getTopSymbols(10);
      if (topSymbols.length === 0) return;

      const zones: LiquidationZone[] = [];
      for (const symbol of topSymbols) {
        try {
          const [ratioRes, oiRes] = await Promise.all([
            fetch(
              `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`,
            ),
            fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`),
          ]);
          if (!ratioRes.ok || !oiRes.ok) continue;
          const ratioData = await ratioRes.json();
          const oiData = await oiRes.json();
          const latestRatio = ratioData?.[ratioData.length - 1];
          if (!latestRatio) continue;

          const priceRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`);
          const priceData = priceRes.ok ? await priceRes.json() : null;
          const price = priceData ? parseFloat(priceData.price) : null;
          if (!price) continue;

          const estimatedZones = LEVERAGE_TIERS.map((leverage) => ({
            leverage,
            longLiqPrice: Number((price * (1 - 1 / leverage)).toFixed(price > 100 ? 2 : 6)),
            shortLiqPrice: Number((price * (1 + 1 / leverage)).toFixed(price > 100 ? 2 : 6)),
          }));

          zones.push({
            symbol,
            price,
            longShortRatio: parseFloat(latestRatio.longShortRatio),
            openInterest: parseFloat(oiData.openInterest),
            estimatedZones,
          });
        } catch {
          continue;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      await this.cache.setJson(CACHE_KEYS.liqZones, zones, 900);
    } catch (err) {
      this.logger.warn(`refreshEstimatedLiquidationZones failed: ${err}`);
    }
  }

  async getEstimatedLiquidationZones(): Promise<LiquidationZone[]> {
    return (await this.cache.getJson<LiquidationZone[]>(CACHE_KEYS.liqZones)) ?? [];
  }

  // ---------- Trending coins (CoinGecko) ----------

  async refreshTrending(): Promise<void> {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/search/trending');
      if (!res.ok) return;
      const data = await res.json();
      const coins: TrendingCoin[] = (data?.coins ?? []).map((c: any) => ({
        symbol: (c.item?.symbol as string)?.toUpperCase() ?? '',
        name: c.item?.name ?? '',
        marketCapRank: c.item?.market_cap_rank ?? null,
      }));
      if (coins.length > 0) await this.cache.setJson(CACHE_KEYS.trending, coins, 900);
    } catch (err) {
      this.logger.warn(`refreshTrending failed: ${err}`);
    }
  }

  async getTrending(): Promise<TrendingCoin[]> {
    return (await this.cache.getJson<TrendingCoin[]>(CACHE_KEYS.trending)) ?? [];
  }

  // ---------- Stablecoin piyasa değeri/akışı (CoinGecko) ----------

  async refreshStablecoins(): Promise<void> {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=stablecoins&order=market_cap_desc&per_page=20&page=1',
      );
      if (!res.ok) return;
      const data = await res.json();
      const totalMarketCap = data.reduce((s: number, c: any) => s + (c.market_cap ?? 0), 0);
      const change24h = data.reduce((s: number, c: any) => s + (c.market_cap_change_24h ?? 0), 0);
      const payload: StablecoinFlowData = {
        totalMarketCap,
        change24h,
        topStablecoins: data
          .slice(0, 5)
          .map((c: any) => ({ symbol: (c.symbol as string).toUpperCase(), marketCap: c.market_cap ?? 0 })),
      };
      await this.cache.setJson(CACHE_KEYS.stablecoins, payload, 900);
    } catch (err) {
      this.logger.warn(`refreshStablecoins failed: ${err}`);
    }
  }

  async getStablecoins(): Promise<StablecoinFlowData | null> {
    return this.cache.getJson<StablecoinFlowData>(CACHE_KEYS.stablecoins);
  }

  // ---------- Altcoin Season Index ----------
  // Standart tanım: top ~50 coin'in (BTC hariç) son 90 günde BTC'yi geçip
  // geçmediği oranı. HistoricalCandle tablosu bunun için yetersiz (34 sembol,
  // birkaç gün eski, canlı güncellenmiyor) — bu yüzden doğrudan Binance
  // klines'tan günlük olarak taze hesaplanıyor.

  private async fetch90dReturn(symbol: string): Promise<number | null> {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=91`);
      if (!res.ok) return null;
      const klines = await res.json();
      if (!Array.isArray(klines) || klines.length < 2) return null;
      const first = parseFloat(klines[0][4]);
      const last = parseFloat(klines[klines.length - 1][4]);
      if (!first) return null;
      return (last - first) / first;
    } catch {
      return null;
    }
  }

  async refreshAltcoinSeason(): Promise<void> {
    try {
      const topSymbols = await this.getTopSymbols(50);
      const altcoins = topSymbols.filter((s) => s !== 'BTCUSDT').slice(0, 49);
      if (altcoins.length === 0) return;

      const btcReturn = await this.fetch90dReturn('BTCUSDT');
      if (btcReturn == null) return;
      await new Promise((r) => setTimeout(r, 150));

      let outperforming = 0;
      let counted = 0;
      for (const symbol of altcoins) {
        const ret = await this.fetch90dReturn(symbol);
        if (ret != null) {
          counted++;
          if (ret > btcReturn) outperforming++;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      if (counted === 0) return;

      const percentage = (outperforming / counted) * 100;
      const classification: AltcoinSeasonData['classification'] =
        percentage >= 75 ? 'Altcoin Season' : percentage <= 25 ? 'Bitcoin Season' : 'Nötr';
      const payload: AltcoinSeasonData = {
        percentage,
        classification,
        outperformingCount: outperforming,
        totalCount: counted,
        updatedAt: new Date().toISOString(),
      };
      await this.cache.setJson(CACHE_KEYS.altcoinSeason, payload, 3600 * 26);
    } catch (err) {
      this.logger.warn(`refreshAltcoinSeason failed: ${err}`);
    }
  }

  async getAltcoinSeason(): Promise<AltcoinSeasonData | null> {
    return this.cache.getJson<AltcoinSeasonData>(CACHE_KEYS.altcoinSeason);
  }

  // ---------- BTC/ETH Spot ETF net akışları (SoSoValue) ----------

  private async fetchEtfFlow(symbol: 'BTC' | 'ETH'): Promise<EtfFlowRow[] | null> {
    const apiKey = process.env.SOSOVALUE_API_KEY;
    if (!apiKey) return null;
    try {
      const url = `https://openapi.sosovalue.com/openapi/v1/etfs/summary-history?symbol=${symbol}&country_code=US&limit=14`;
      const res = await fetch(url, { headers: { 'x-soso-api-key': apiKey } });
      if (!res.ok) return null;
      const body = await res.json();
      const rows = body?.data ?? [];
      return rows.map((r: any) => ({
        date: r.date,
        netFlow: r.total_net_inflow,
        cumulativeNetFlow: r.cum_net_inflow,
        totalNetAssets: r.total_net_assets,
      }));
    } catch {
      return null;
    }
  }

  async refreshEtfFlows(): Promise<void> {
    const [btc, eth] = await Promise.all([this.fetchEtfFlow('BTC'), this.fetchEtfFlow('ETH')]);
    if (btc) await this.cache.setJson(CACHE_KEYS.etfFlowsBtc, btc, 3600 * 20);
    if (eth) await this.cache.setJson(CACHE_KEYS.etfFlowsEth, eth, 3600 * 20);
  }

  async getEtfFlows(): Promise<{ btc: EtfFlowRow[]; eth: EtfFlowRow[] }> {
    const [btc, eth] = await Promise.all([
      this.cache.getJson<EtfFlowRow[]>(CACHE_KEYS.etfFlowsBtc),
      this.cache.getJson<EtfFlowRow[]>(CACHE_KEYS.etfFlowsEth),
    ]);
    return { btc: btc ?? [], eth: eth ?? [] };
  }
}
