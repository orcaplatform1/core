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

async function fetchYahoo(yahooSymbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=5y&interval=1d`;
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

async function seedSymbol(ourSymbol: string, yahooSymbol: string) {
  console.log(`${ourSymbol} (${yahooSymbol}) verisi çekiliyor...`);

  const candles = await fetchYahoo(yahooSymbol);

  if (!candles || candles.length === 0) {
    console.log(`${ourSymbol}: veri bulunamadı, atlanıyor.`);
    return;
  }

  console.log(`${ourSymbol}: ${candles.length} mum bulundu, kaydediliyor...`);

  for (const c of candles) {
    await prisma.historicalCandle.upsert({
      where: { symbol_timestamp: { symbol: ourSymbol, timestamp: new Date(c.time) } },
      update: {},
      create: {
        symbol: ourSymbol,
        assetType: 'FOREX',
        timestamp: new Date(c.time),
        open: c.open ?? c.close,
        high: c.high ?? c.close,
        low: c.low ?? c.close,
        close: c.close,
        volume: c.volume ?? null,
      },
    });
  }

  console.log(`${ourSymbol} tamamlandı.`);
}

async function main() {
  for (const [ourSymbol, yahooSymbol] of Object.entries(SYMBOLS)) {
    await seedSymbol(ourSymbol, yahooSymbol);
    await new Promise((r) => setTimeout(r, 500));
  }

  await prisma.$disconnect();
  console.log('Forex/emtia verisi tamamlandı.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
