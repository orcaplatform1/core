export type TickerRow = {
  symbol: string;
  price: number;
  changePercent: number;
  quoteVolume: number;
  sparkline?: number[];
};

export type CryptoMovers = {
  top10: TickerRow[];
  hot10: TickerRow[];
  gainers: TickerRow[];
  losers: TickerRow[];
};

export type HeatmapCoin = {
  symbol: string;
  name: string;
  marketCap: number;
  changePercent24h: number;
};

export type CryptoHeatmap = {
  coins: HeatmapCoin[];
  btcDominance: number | null;
  ethDominance: number | null;
};

export type FundingRow = {
  symbol: string;
  fundingRatePercent: number;
};

export type FearGreedData = {
  value: number;
  classification: string;
  updatedAt: string;
};

export type LiquidationZone = {
  symbol: string;
  price: number;
  longShortRatio: number;
  openInterest: number;
  estimatedZones: { leverage: number; longLiqPrice: number; shortLiqPrice: number }[];
};

export type LiquidationZonesResponse = {
  estimated: true;
  zones: LiquidationZone[];
};

export type ForexQuote = {
  symbol: string;
  price: number;
  changePercent: number;
  delayed: true;
};

export type EconomicIndicator = {
  id: string;
  label: string;
  seriesId: string;
  latestValue: number;
  previousValue: number | null;
  latestDate: string;
  unit: string;
};

export type FomcMeeting = {
  date: string;
  label: string;
};

export type EconomicIndicatorsResponse = {
  indicators: EconomicIndicator[];
  upcomingFomcMeetings: FomcMeeting[];
};

export type BistIndexData = {
  price: number;
  changePercent: number;
};

export type BistQuote = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
};

export type BistStocksResponse = {
  stocks: BistQuote[];
  gainers: BistQuote[];
  losers: BistQuote[];
};

export type GoldAndTlData = {
  gramAltinTry: number;
  onsAltinUsd: number;
  usdTry: { price: number; changePercent: number };
  eurTry: { price: number; changePercent: number };
};

export type CotRow = {
  currency: string;
  leveragedLong: number;
  leveragedShort: number;
  netPosition: number;
  netPositionChange: number | null;
  reportDate: string;
};

export type CorrelationMatrix = {
  symbols: string[];
  matrix: number[][];
};

export type TrendingCoin = {
  symbol: string;
  name: string;
  marketCapRank: number | null;
};

export type StablecoinFlowData = {
  totalMarketCap: number;
  change24h: number;
  topStablecoins: { symbol: string; marketCap: number }[];
};

export type AltcoinSeasonData = {
  percentage: number;
  classification: "Bitcoin Season" | "Nötr" | "Altcoin Season";
  outperformingCount: number;
  totalCount: number;
  updatedAt: string;
};

export type EtfFlowRow = {
  date: string;
  netFlow: number;
  cumulativeNetFlow: number;
  totalNetAssets: number;
};

export type EtfFlowsResponse = {
  btc: EtfFlowRow[];
  eth: EtfFlowRow[];
};

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
  side: "BUY" | "SELL";
  time: string;
};

export type OrderFlowData = {
  symbol: string;
  updatedAt: string;

  midPrice: number;
  bestBid: number;
  bestAsk: number;
  spreadPercent: number;
  levels: OrderFlowLevel[];
  totalBidQty: number;
  totalAskQty: number;
  bidAskImbalancePercent: number;

  cumulativeDelta: number;
  cvdHistory: CvdBucket[];
  largeTrades: LargeTrade[];
  recentTrades: LargeTrade[];

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

export type HeatmapRow = {
  time: string;
  bid: number[];
  ask: number[];
  midPrice: number;
};

export type HeatmapResponse = {
  symbol: string;
  ready: boolean;
  bucketSize: number;
  priceLevels: number[];
  rows: HeatmapRow[];
  midPrice: number | null;
  updatedAt: string;
};
