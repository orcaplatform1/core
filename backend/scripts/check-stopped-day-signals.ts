import { PrismaClient } from '../generated/prisma/client';
const prisma = new PrismaClient();

type Kline = [number, string, string, string, string, string, ...unknown[]];

async function fetchKlines(symbol: string, interval: string, startTime: number, limit = 200): Promise<Kline[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance error ${res.status} for ${symbol}`);
  return (await res.json()) as Kline[];
}

(async () => {
  const signals = await prisma.trackedSignal.findMany({
    where: { style: 'DAY', status: 'HIT_STOP' },
    orderBy: { closedAt: 'desc' },
    take: 8,
  });

  console.log(`Found ${signals.length} HIT_STOP DAY signals\n`);

  let continuedCount = 0;

  for (const sig of signals) {
    const entry = (sig.entryZoneTop + sig.entryZoneBottom) / 2;
    const triggeredAt = sig.triggeredAt ?? sig.createdAt;
    const closedAt = sig.closedAt ?? triggeredAt;

    console.log('='.repeat(70));
    console.log(`${sig.symbol} | ${sig.direction} | entry=${entry} stop=${sig.stop} tp1=${sig.tp1}`);
    console.log(`triggeredAt=${triggeredAt.toISOString()} closedAt=${closedAt.toISOString()}`);

    let klines: Kline[] = [];
    try {
      // 1h candles starting from trigger, up to 200 hours (~8 days) forward
      klines = await fetchKlines(sig.symbol, '1h', triggeredAt.getTime(), 200);
    } catch (e) {
      console.log(`  ERROR fetching klines: ${(e as Error).message}`);
      continue;
    }

    if (klines.length === 0) {
      console.log('  No kline data available after trigger time.');
      continue;
    }

    const closes = klines.map((k) => parseFloat(k[4]));
    const highs = klines.map((k) => parseFloat(k[2]));
    const lows = klines.map((k) => parseFloat(k[3]));

    const isLong = sig.direction === 'LONG';
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    const lastClose = closes[closes.length - 1];
    const hoursSpan = klines.length;

    // "Continued in original breakout direction" = price later made a new extreme
    // beyond the entry zone in the breakout direction (i.e. the stop-out looks like
    // a shakeout, not a real reversal), OR the price is still beyond entry at the
    // end of the observed window.
    const continued = isLong ? maxHigh > entry : minLow < entry;

    console.log(
      `  window=${hoursSpan}h  maxHigh=${maxHigh}  minLow=${minLow}  lastClose=${lastClose}  entry=${entry}`,
    );
    console.log(`  => ${continued ? 'DEVAM ETTI (orijinal yönde)' : 'DEVAM ETMEDI / TERS DÖNDÜ'}`);

    if (continued) continuedCount++;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`SONUC: ${continuedCount}/${signals.length} sinyalde fiyat orijinal kırılım yönünde devam etti.`);

  await prisma.$disconnect();
})();
