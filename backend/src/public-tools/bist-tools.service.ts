import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../cache/redis-cache.service';

export interface BistQuote {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

const INDEX_CACHE_KEY = 'tools:bist:index';
const STOCKS_CACHE_KEY = 'tools:bist:stocks';

// Yahoo Finance BIST sembolleri — forex-tools.service.ts'deki aynı chart API deseni.
// BIST30'un büyük, farklı sektörlerden (havacılık/bankacılık/savunma/holding/
// perakende/cam/çelik/enerji/otomotiv) isimleri.
const BIST_STOCKS: Record<string, string> = {
  THYAO: 'THYAO.IS',
  GARAN: 'GARAN.IS',
  ASELS: 'ASELS.IS',
  AKBNK: 'AKBNK.IS',
  KCHOL: 'KCHOL.IS',
  BIMAS: 'BIMAS.IS',
  SISE: 'SISE.IS',
  EREGL: 'EREGL.IS',
  TUPRS: 'TUPRS.IS',
  SAHOL: 'SAHOL.IS',
  FROTO: 'FROTO.IS',
};

@Injectable()
export class BistToolsService {
  private readonly logger = new Logger(BistToolsService.name);

  constructor(private readonly cache: RedisCacheService) {}

  private async fetchYahoo(
    yahooSymbol: string,
  ): Promise<{ price: number; changePercent: number; name?: string } | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=2d&interval=15m`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return null;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const price = meta.regularMarketPrice;
      const prevClose = meta.previousClose ?? meta.chartPreviousClose;
      if (price == null || prevClose == null) return null;
      return {
        price,
        changePercent: ((price - prevClose) / prevClose) * 100,
        name: meta.longName ?? meta.shortName,
      };
    } catch {
      return null;
    }
  }

  async refreshBist(): Promise<void> {
    try {
      const index = await this.fetchYahoo('%5EXU100');
      if (index) {
        await this.cache.setJson(INDEX_CACHE_KEY, { price: index.price, changePercent: index.changePercent }, 60 * 12);
      }

      const rows: BistQuote[] = [];
      for (const [symbol, yahooSymbol] of Object.entries(BIST_STOCKS)) {
        const quote = await this.fetchYahoo(yahooSymbol);
        if (quote) rows.push({ symbol, name: quote.name ?? symbol, price: quote.price, changePercent: quote.changePercent });
        await new Promise((r) => setTimeout(r, 150));
      }
      if (rows.length > 0) await this.cache.setJson(STOCKS_CACHE_KEY, rows, 60 * 12);
    } catch (err) {
      this.logger.warn(`refreshBist failed: ${err}`);
    }
  }

  async getIndex(): Promise<{ price: number; changePercent: number } | null> {
    return this.cache.getJson(INDEX_CACHE_KEY);
  }

  async getStocks() {
    const rows = (await this.cache.getJson<BistQuote[]>(STOCKS_CACHE_KEY)) ?? [];
    const gainers = [...rows].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
    const losers = [...rows].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);
    return { stocks: rows, gainers, losers };
  }
}
