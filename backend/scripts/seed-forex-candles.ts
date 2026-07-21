import { PrismaClient } from '../generated/prisma/client';
const prisma = new PrismaClient();

const SYMBOLS: Record<string, string> = {
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
  EURCHF: 'EURCHF=X',
  AUDJPY: 'AUDJPY=X',
  CADJPY: 'CADJPY=X',
  XAUUSD: 'GC=F',
  XAGUSD: 'SI=F',
  BRENT: 'BZ=F',
  WTI: 'CL=F',
  USDCNH: 'USDCNH=X',
  USDZAR: 'USDZAR=X',
  USDMXN: 'USDMXN=X',
};

const TIMEFRAMES: { timeframe: string; interval: string; range: string }[] = [
  { timeframe: '1d', interval: '1d', range: '5y' },
  { timeframe: '1h', interval: '1h', range: '2y' },
];

async function fetchYahoo(yahooSymbol: string, interval: string, range: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${interval}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const timestamps: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  return timestamps.map((t, i) => ({
    time: t * 1000,
    open: quote.open?.[i],
    high: quote.high?.[i],
    low: quote.low?.[i],
    close: quote.close?.[i],
    volume: quote.volume?.[i],
  })).filter((c) => c.close != null);
}

async function seedSymbolTimeframe(ourSymbol: string, yahooSymbol: string, timeframe: string, interval: string, range: string) {
  const candles = await fetchYahoo(yahooSymbol, interval, range);
  if (!candles || candles.length === 0) {
    console.log(`${ourSymbol} [${timeframe}]: veri bulunamadı, atlanıyor.`);
    return;
  }
  console.log(`${ourSymbol} [${timeframe}]: ${candles.length} mum, kaydediliyor...`);
  for (const c of candles) {
    await prisma.historicalCandle.upsert({
      where: { symbol_timeframe_timestamp: { symbol: ourSymbol, timeframe, timestamp: new Date(c.time) } },
      update: {},
      create: {
        symbol: ourSymbol,
        assetType: 'FOREX',
        timeframe,
        timestamp: new Date(c.time),
        open: c.open ?? c.close,
        high: c.high ?? c.close,
        low: c.low ?? c.close,
        close: c.close,
        volume: c.volume ?? null,
      },
    });
  }
  console.log(`${ourSymbol} [${timeframe}] tamamlandı.`);
}

async function main() {
  for (const [ourSymbol, yahooSymbol] of Object.entries(SYMBOLS)) {
    for (const tf of TIMEFRAMES) {
      await seedSymbolTimeframe(ourSymbol, yahooSymbol, tf.timeframe, tf.interval, tf.range);
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  await prisma.$disconnect();
  console.log('Forex/emtia verisi tamamlandı.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
