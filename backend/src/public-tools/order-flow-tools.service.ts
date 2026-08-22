import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../cache/redis-cache.service';

export type OrderFlowLevel = {
  price: number;
  bidQty: number;
  askQty: number;
  buyVolume: number;
  sellVolume: number;
};

export type CvdBucket = {
  time: string;
  delta: number;
  cumulative: number;
};

export type LargeTrade = {
  price: number;
  qty: number;
  quoteQty: number;
  side: 'BUY' | 'SELL';
  time: string;
};

export type OrderFlowData = {
  symbol: string;
  updatedAt: string;

  // Order book
  midPrice: number;
  bestBid: number;
  bestAsk: number;
  spreadPercent: number;
  levels: OrderFlowLevel[];
  totalBidQty: number;
  totalAskQty: number;
  bidAskImbalancePercent: number;

  // Trade flow (son ~1000 aggTrade penceresi)
  cumulativeDelta: number;
  cvdHistory: CvdBucket[];
  largeTrades: LargeTrade[];
  recentTrades: LargeTrade[];

  // Piyasa bağlamı
  markPrice: number | null;
  fundingRatePercent: number | null;
  nextFundingTime: string | null;
  openInterest: number | null;
  openInterestValueUsd: number | null;
  priceChangePercent24h: number | null;
  quoteVolume24h: number | null;
  globalLongShortAccountRatio: number | null;
  topTraderLongShortPositionRatio: number | null;
  takerBuySellRatio: number | null;
};

const CACHE_TTL_SEC = 3;
const DEPTH_LIMIT = 50;
const AGG_TRADES_LIMIT = 1000;
const MAX_LEVELS_RETURNED = 200;
const CVD_BUCKET_COUNT = 40;
const LARGE_TRADES_COUNT = 15;
const RECENT_TRADES_COUNT = 350;
const SYMBOLS_CACHE_KEY = 'tools:crypto:order-flow:symbols';
const SYMBOLS_CACHE_TTL_SEC = 900;
const MARKET_CAP_FETCH_COUNT = 80;
const TARGET_SYMBOL_COUNT = 50;
const STABLECOIN_DENYLIST = new Set([
  'USDT', 'USDC', 'DAI', 'FDUSD', 'TUSD', 'USDE', 'USDS', 'PYUSD', 'USDP', 'GUSD', 'EURS', 'USDD',
]);

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

@Injectable()
export class OrderFlowToolsService {
  private readonly logger = new Logger(OrderFlowToolsService.name);

  constructor(private readonly cache: RedisCacheService) {}

  // Hacme göre top-N listesi dakika dakika değiştiği için (kullanıcı gözlemi) piyasa
  // değerine (market cap) göre sabit top-50 listesi kullanılıyor — CoinGecko sıralamasını
  // Binance Futures'ta gerçekten işlem gören USDT-marjinli sözleşmelerle eşleştiriyoruz
  // (bazı büyük coinlerin futures karşılığı "1000X" önekiyle olabiliyor, örn. 1000PEPE).
  async getAllowedSymbols(): Promise<string[]> {
    const cached = await this.cache.getJson<string[]>(SYMBOLS_CACHE_KEY);
    if (cached && cached.length > 0) return cached;

    try {
      const [markets, futuresData] = await Promise.all([
        fetchJson(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${MARKET_CAP_FETCH_COUNT}&page=1`,
        ),
        fetchJson('https://fapi.binance.com/fapi/v1/ticker/24hr'),
      ]);
      if (!Array.isArray(markets) || !Array.isArray(futuresData)) return [];

      const futuresSet = new Set<string>(
        futuresData
          .filter((t: any) => typeof t.symbol === 'string' && t.symbol.endsWith('USDT') && !t.symbol.includes('_'))
          .map((t: any) => t.symbol),
      );

      const symbols: string[] = [];
      for (const coin of markets) {
        if (symbols.length >= TARGET_SYMBOL_COUNT) break;
        const base = (coin.symbol as string)?.toUpperCase();
        if (!base || STABLECOIN_DENYLIST.has(base)) continue;
        const match = [`${base}USDT`, `1000${base}USDT`].find((c) => futuresSet.has(c));
        if (match && !symbols.includes(match)) symbols.push(match);
      }

      if (symbols.length > 0) await this.cache.setJson(SYMBOLS_CACHE_KEY, symbols, SYMBOLS_CACHE_TTL_SEC);
      return symbols;
    } catch (err) {
      this.logger.warn(`getAllowedSymbols failed: ${err}`);
      return [];
    }
  }

  async isAllowedSymbol(symbol: string): Promise<boolean> {
    const symbols = await this.getAllowedSymbols();
    return symbols.includes(symbol);
  }

  async getOrderFlow(symbol: string): Promise<OrderFlowData | null> {
    const cacheKey = `tools:crypto:order-flow:${symbol}`;
    const cached = await this.cache.getJson<OrderFlowData>(cacheKey);
    if (cached) return cached;

    try {
      const base = 'https://fapi.binance.com';
      const [depth, trades, openInterest, premiumIndex, ticker24h, globalRatio, topRatio, takerRatio] =
        await Promise.all([
          fetchJson(`${base}/fapi/v1/depth?symbol=${symbol}&limit=${DEPTH_LIMIT}`),
          fetchJson(`${base}/fapi/v1/aggTrades?symbol=${symbol}&limit=${AGG_TRADES_LIMIT}`),
          fetchJson(`${base}/fapi/v1/openInterest?symbol=${symbol}`),
          fetchJson(`${base}/fapi/v1/premiumIndex?symbol=${symbol}`),
          fetchJson(`${base}/fapi/v1/ticker/24hr?symbol=${symbol}`),
          fetchJson(`${base}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`),
          fetchJson(`${base}/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=5m&limit=1`),
          fetchJson(`${base}/futures/data/takerlongshortRatio?symbol=${symbol}&period=5m&limit=1`),
        ]);

      const bids: [string, string][] = depth?.bids ?? [];
      const asks: [string, string][] = depth?.asks ?? [];
      if (bids.length === 0 || asks.length === 0) return null;

      const bestBid = parseFloat(bids[0][0]);
      const bestAsk = parseFloat(asks[0][0]);
      const midPrice = (bestBid + bestAsk) / 2;

      // Bucket boyutu = borsanın book'ta fiilen kullandığı tick (ardışık seviyeler arası
      // en küçük fark). Sabit bir yüzde varsayımı (ör. midPrice*%0.02) BTC gibi yüksek
      // fiyatlı sembollerde 50 book seviyesinin tamamını tek satıra sıkıştırıyordu.
      const priceLevels = [...bids, ...asks].map(([p]) => parseFloat(p)).sort((a, b) => a - b);
      let tickSize = Infinity;
      for (let i = 1; i < priceLevels.length; i++) {
        const diff = priceLevels[i] - priceLevels[i - 1];
        if (diff > 0 && diff < tickSize) tickSize = diff;
      }
      if (!Number.isFinite(tickSize) || tickSize <= 0) {
        const decimals = (bids[0][0].split('.')[1] ?? '').length;
        tickSize = decimals > 0 ? Math.pow(10, -decimals) : 1;
      }
      // Float çıkarma hatasını temizle (ör. 0.1 yerine 0.09999999999417923 gelmesin).
      tickSize = Number(tickSize.toPrecision(8));
      const bucketOf = (price: number) => Number((Math.round(price / tickSize) * tickSize).toPrecision(10));

      const levelMap = new Map<number, OrderFlowLevel>();
      const getLevel = (price: number): OrderFlowLevel => {
        let lvl = levelMap.get(price);
        if (!lvl) {
          lvl = { price, bidQty: 0, askQty: 0, buyVolume: 0, sellVolume: 0 };
          levelMap.set(price, lvl);
        }
        return lvl;
      };

      for (const [priceStr, qtyStr] of bids) {
        getLevel(bucketOf(parseFloat(priceStr))).bidQty += parseFloat(qtyStr);
      }
      for (const [priceStr, qtyStr] of asks) {
        getLevel(bucketOf(parseFloat(priceStr))).askQty += parseFloat(qtyStr);
      }

      const tradesArr: any[] = Array.isArray(trades) ? trades : [];
      let cumulativeDelta = 0;
      for (const t of tradesArr) {
        const lvl = getLevel(bucketOf(parseFloat(t.p)));
        const qty = parseFloat(t.q);
        // Binance aggTrade: m=true -> alıcı maker, yani agresif satıcı (taker sell).
        if (t.m === true) {
          lvl.sellVolume += qty;
          cumulativeDelta -= qty;
        } else {
          lvl.buyVolume += qty;
          cumulativeDelta += qty;
        }
      }

      // Önce fiyata göre azalan sırayla kesmek (slice) bid tarafını (mid'in altı) tamamen
      // atabiliyordu — trade geçmişinden gelen üst seviyeler payı doldurunca alttaki
      // gerçek bid defteri hiç payload'a girmiyordu. Mid'e en yakın N seviyeyi tutup
      // SONRA fiyata göre sıralıyoruz, iki taraf da simetrik korunuyor.
      const levels = Array.from(levelMap.values())
        .sort((a, b) => Math.abs(a.price - midPrice) - Math.abs(b.price - midPrice))
        .slice(0, MAX_LEVELS_RETURNED)
        .sort((a, b) => b.price - a.price);

      // Zaman bazlı kümülatif delta geçmişi (CVD) — aggTrade penceresini eşit sayıda
      // parçaya bölüp her parçanın net delta'sını hesaplıyoruz, sonra kümülatif alıyoruz.
      const cvdHistory: CvdBucket[] = [];
      if (tradesArr.length > 0) {
        const bucketLen = Math.max(1, Math.ceil(tradesArr.length / CVD_BUCKET_COUNT));
        let running = 0;
        for (let i = 0; i < tradesArr.length; i += bucketLen) {
          const chunk = tradesArr.slice(i, i + bucketLen);
          let delta = 0;
          for (const t of chunk) {
            const qty = parseFloat(t.q);
            delta += t.m === true ? -qty : qty;
          }
          running += delta;
          const lastTrade = chunk[chunk.length - 1];
          cvdHistory.push({
            time: new Date(lastTrade.T).toISOString(),
            delta,
            cumulative: running,
          });
        }
      }

      const mappedTrades: LargeTrade[] = tradesArr.map((t) => {
        const price = parseFloat(t.p);
        const qty = parseFloat(t.q);
        return {
          price,
          qty,
          quoteQty: price * qty,
          side: (t.m === true ? 'SELL' : 'BUY') as 'BUY' | 'SELL',
          time: new Date(t.T).toISOString(),
        };
      });

      // Büyük emirler ("whale prints") — pencere içindeki USD değerine göre en büyük N işlem.
      const largeTrades: LargeTrade[] = [...mappedTrades]
        .sort((a, b) => b.quoteQty - a.quoteQty)
        .slice(0, LARGE_TRADES_COUNT);

      // Baloncuk grafiği için kronolojik (zaman sıralı) işlem penceresi — performans için son N.
      const recentTrades: LargeTrade[] = mappedTrades.slice(-RECENT_TRADES_COUNT);

      const totalBidQty = bids.reduce((s, [, q]) => s + parseFloat(q), 0);
      const totalAskQty = asks.reduce((s, [, q]) => s + parseFloat(q), 0);
      const bidAskImbalancePercent =
        totalBidQty + totalAskQty > 0 ? ((totalBidQty - totalAskQty) / (totalBidQty + totalAskQty)) * 100 : 0;

      const markPrice = premiumIndex ? parseFloat(premiumIndex.markPrice) : null;
      const fundingRatePercent = premiumIndex ? parseFloat(premiumIndex.lastFundingRate) * 100 : null;
      const nextFundingTime = premiumIndex?.nextFundingTime
        ? new Date(premiumIndex.nextFundingTime).toISOString()
        : null;

      const oiQty = openInterest ? parseFloat(openInterest.openInterest) : null;

      const globalRatioEntry = Array.isArray(globalRatio) ? globalRatio[globalRatio.length - 1] : null;
      const topRatioEntry = Array.isArray(topRatio) ? topRatio[topRatio.length - 1] : null;
      const takerRatioEntry = Array.isArray(takerRatio) ? takerRatio[takerRatio.length - 1] : null;

      const payload: OrderFlowData = {
        symbol,
        updatedAt: new Date().toISOString(),

        midPrice,
        bestBid,
        bestAsk,
        spreadPercent: midPrice > 0 ? ((bestAsk - bestBid) / midPrice) * 100 : 0,
        levels,
        totalBidQty,
        totalAskQty,
        bidAskImbalancePercent,

        cumulativeDelta,
        cvdHistory,
        largeTrades,
        recentTrades,

        markPrice,
        fundingRatePercent,
        nextFundingTime,
        openInterest: oiQty,
        openInterestValueUsd: oiQty != null && markPrice != null ? oiQty * markPrice : null,
        priceChangePercent24h: ticker24h ? parseFloat(ticker24h.priceChangePercent) : null,
        quoteVolume24h: ticker24h ? parseFloat(ticker24h.quoteVolume) : null,
        globalLongShortAccountRatio: globalRatioEntry ? parseFloat(globalRatioEntry.longShortRatio) : null,
        topTraderLongShortPositionRatio: topRatioEntry ? parseFloat(topRatioEntry.longShortRatio) : null,
        takerBuySellRatio: takerRatioEntry ? parseFloat(takerRatioEntry.buySellRatio) : null,
      };
      await this.cache.setJson(cacheKey, payload, CACHE_TTL_SEC);
      return payload;
    } catch (err) {
      this.logger.warn(`getOrderFlow(${symbol}) failed: ${err}`);
      return null;
    }
  }
}
