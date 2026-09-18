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

export type FootprintLevel = {
  price: number;
  buyVol: number;
  sellVol: number;
};

export type FootprintCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  levels: FootprintLevel[];
  totalBuyVol: number;
  totalSellVol: number;
  closed: boolean;
};

export type HeatmapResponse = {
  symbol: string;
  ready: boolean;
  bucketSize: number;
  priceLevels: number[];
  rows: HeatmapRow[];
  trades: LargeTrade[];
  midPrice: number | null;
  updatedAt: string;
  footprintIntervalMs: number;
  footprint: FootprintCandle[];
};

// ---------- Döngü göstergeleri ----------

export type CbbiIndicatorScores = {
  piCycle: number | null;
  rupl: number | null;
  rhodl: number | null;
  puell: number | null;
  twoYearMa: number | null;
  rainbow: number | null;
  mvrv: number | null;
  reserveRisk: number | null;
  woobull: number | null;
};

export type CbbiData = {
  price: number | null;
  confidence: number | null;
  indicators: CbbiIndicatorScores;
  updatedAt: string;
};

export type CycleSnapshot = {
  mvrvZscore: number | null;
  piCycle: { sma111: number | null; sma350x2: number | null; crossed: boolean } | null;
  puellMultiple: number | null;
  mayerMultiple: number | null;
  rhodlRatio: number | null;
  reserveRisk: number | null;
  goldenRatio: { price: number | null; sma350: number | null; x2618: number | null; x3236: number | null } | null;
  ma200Week: { price: number | null; ma: number | null } | null;
  updatedAt: string;
};

export type CycleMacro = {
  rainbow: { price: number | null; bandIndex: number | null; bandLabel: string | null } | null;
  terminalPrice: number | null;
  m2global: number | null;
  macroScore: number | null;
  ssr: number | null;
  seasonalityMonthly: Record<string, number> | null;
  updatedAt: string;
};

export type ExchangeFlows = {
  netflowBtc: number | null;
  reserveBtc: number | null;
  inflowUsd: number | null;
  outflowUsd: number | null;
  updatedAt: string;
};

export type Ahr999Data = {
  value: number | null;
  price: number | null;
  geoMean200d: number | null;
  updatedAt: string;
};

export type TwoYearMaMultiplierData = {
  value: number | null;
  price: number | null;
  ma730d: number | null;
  band5x: number | null;
  updatedAt: string;
};

export type RsiHeatmapRow = {
  symbol: string;
  rsi14: number;
};

export type LongShortRow = {
  symbol: string;
  longShortRatio: number;
};

export type MarketPulse = {
  confidence: number | null;
  hotCount: number;
  totalCount: number;
  classification: string;
  updatedAt: string | null;
};

export type DcaResult = {
  investedTotal: number;
  currentValue: number;
  roiPercent: number;
  btcAccumulated: number;
  purchaseCount: number;
  averageCost: number;
};
