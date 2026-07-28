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
