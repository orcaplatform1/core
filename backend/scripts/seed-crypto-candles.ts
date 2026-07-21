import { PrismaClient } from '../generated/prisma/client';
const prisma = new PrismaClient();

const TIMEFRAMES: { timeframe: string; interval: string; batches: number }[] = [
  { timeframe: '1d', interval: '1d', batches: 2 }, // ~2000 gün (~5.5 yıl)
  { timeframe: '1h', interval: '1h', batches: 6 }, // ~6000 saat (~8 ay)
];
const LIMIT = 1000;

async function getTop50Symbols(): Promise<string[]> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1',
  );
  if (!res.ok) throw new Error(`CoinGecko API hata: ${res.status}`);
  const data = await res.json();
  return data.map((coin: any) => coin.symbol.toUpperCase() + 'USDT');
}

async function fetchKlines(symbol: string, interval: string, endTime?: number) {
  const url = new URL('https://api.binance.com/api/v3/klines');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('limit', String(LIMIT));
  if (endTime) url.searchParams.set('endTime', String(endTime));
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  return res.json();
}

async function seedSymbolTimeframe(symbol: string, timeframe: string, interval: string, batches: number) {
  let allCandles: any[] = [];
  let endTime: number | undefined = undefined;
  for (let i = 0; i < batches; i++) {
    const batch = await fetchKlines(symbol, interval, endTime);
    if (!batch || batch.length === 0) break;
    allCandles = [...batch, ...allCandles];
    endTime = batch[0][0] - 1;
  }
  if (allCandles.length === 0) {
    console.log(`${symbol} [${timeframe}]: bulunamadı, atlanıyor.`);
    return;
  }
  console.log(`${symbol} [${timeframe}]: ${allCandles.length} mum, kaydediliyor...`);
  for (const candle of allCandles) {
    const [openTime, open, high, low, close, volume] = candle;
    await prisma.historicalCandle.upsert({
      where: { symbol_timeframe_timestamp: { symbol, timeframe, timestamp: new Date(openTime) } },
      update: {},
      create: {
        symbol,
        timeframe,
        timestamp: new Date(openTime),
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseFloat(volume),
      },
    });
  }
  console.log(`${symbol} [${timeframe}] tamamlandı.`);
}

async function main() {
  console.log('CoinGecko üzerinden ilk 50 coin alınıyor...');
  const symbols = await getTop50Symbols();
  console.log('Semboller:', symbols.join(', '));
  for (const symbol of symbols) {
    for (const tf of TIMEFRAMES) {
      await seedSymbolTimeframe(symbol, tf.timeframe, tf.interval, tf.batches);
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  await prisma.$disconnect();
  console.log('Tüm işlem tamamlandı.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
