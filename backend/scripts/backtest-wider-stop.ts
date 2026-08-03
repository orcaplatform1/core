// Geriye donuk simulasyon: Day-trade Turtle Soup stop tamponunu 0.15 ATR (15dk) -> 1.0 ATR
// yapinca, mevcut 8 HIT_STOP sinyali gercekten stop olur muydu, yoksa TP1/2/3'e ulasir miydi?
// Canliya surulmeden ONCE calistirilan salt-okunur bir analiz scripti - DB'ye yazma yok.
import { PrismaClient } from '../generated/prisma/client';
const prisma = new PrismaClient();

type Candle = { time: number; open: number; high: number; low: number; close: number };

const OLD_COEF = 0.15; // scanner.service.ts:628 - mevcut deger
const NEW_COEF = 1.0; // test edilecek deger

async function fetchKlines(symbol: string, interval: string, endTime: number, limit: number): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&endTime=${endTime}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance ${res.status} ${symbol}`);
  const data = await res.json();
  return data.map((c: any) => ({
    time: c[0], open: parseFloat(c[1]), high: parseFloat(c[2]), low: parseFloat(c[3]), close: parseFloat(c[4]),
  }));
}

// scanner.service.ts:178-187 ile birebir ayni
function atr(candles: Candle[], period = 14): number {
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], prev = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)));
  }
  const recent = trs.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

// Sinyalin uretildigi anki confirmCandle'i (buildDayTradeSetup'taki m15Candles[m-1])
// entryZoneTop/Bottom degerleriyle eslestirerek geri buluyoruz - boylece scan zamanlamasindaki
// belirsizlikten bagimsiz, DB'deki gercek degerlerle tam eslesen mum setini elde ediyoruz.
async function locateConfirmCandleSet(symbol: string, createdAt: Date, zoneTop: number, zoneBottom: number) {
  const base = createdAt.getTime();
  const offsetsMin = [0, 15, -15, 30, -30, 45, -45, 60, -60, 90, -90];
  let best: { candles: Candle[]; diff: number } | null = null;
  for (const off of offsetsMin) {
    const endTime = base + off * 60 * 1000;
    let candles: Candle[];
    try {
      candles = await fetchKlines(symbol, '15m', endTime, 40);
    } catch {
      continue;
    }
    if (candles.length < 20) continue;
    const last = candles[candles.length - 1];
    const top = Math.max(last.open, last.close);
    const bottom = Math.min(last.open, last.close);
    const diff = Math.abs(top - zoneTop) + Math.abs(bottom - zoneBottom);
    if (diff < 1e-9) return { candles, exact: true };
    if (!best || diff < best.diff) best = { candles, diff };
  }
  return best ? { candles: best.candles, exact: false, diff: best.diff } : null;
}

(async () => {
  // Kapanmis (gercekten tetiklenip sonuclanmis) tum DAY sinyalleri: HIT_STOP + HIT_TP1/2/3 + EXPIRED.
  // INVALIDATED haric tutuluyor - o kayitlar hic tetiklenmeden iptal oldugu icin gercek bir
  // pozisyon/stop deneyimi yok, bu testte anlamsiz.
  const signals = await prisma.trackedSignal.findMany({
    where: { style: 'DAY', status: { in: ['HIT_STOP', 'HIT_TP1', 'HIT_TP2', 'HIT_TP3', 'EXPIRED'] } },
    orderBy: { closedAt: 'desc' },
    take: 100,
  });

  console.log(`${signals.length} kapanmis DAY sinyali bulundu (HIT_STOP/HIT_TP1-3/EXPIRED).\n`);
  const minRR = 1.5;

  const rows: any[] = [];

  for (const sig of signals) {
    console.log('='.repeat(78));
    console.log(`${sig.symbol} | ${sig.direction} | eski durum: ${sig.status}`);

    const located = await locateConfirmCandleSet(sig.symbol, sig.createdAt, sig.entryZoneTop, sig.entryZoneBottom);
    if (!located) {
      console.log('  HATA: confirmCandle bulunamadi, atlaniyor.');
      continue;
    }
    if (!located.exact) {
      console.log(`  UYARI: entry zone tam eslesmedi (yakinsama farki=${located.diff}), yaklasik deger kullaniliyor.`);
    }

    const candles = located.candles;
    const confirmCandle = candles[candles.length - 1];
    const breakoutCandle = candles[candles.length - 2];
    const bullish = sig.direction === 'LONG';
    const entry = confirmCandle.close;
    const breakoutExtreme = bullish ? breakoutCandle.low : breakoutCandle.high;
    const atr15 = atr(candles, 14);

    const oldWickBuffer = atr15 * OLD_COEF;
    const reconstructedOldStop = bullish ? breakoutExtreme - oldWickBuffer : breakoutExtreme + oldWickBuffer;
    const stopDiff = Math.abs(reconstructedOldStop - sig.stop);
    const stopDiffPct = (stopDiff / sig.stop) * 100;
    // TP1 vurulunca canli sistem stop'u basabasa cekiyor (scanner.service.ts:1178-1185),
    // DB'deki stop artik orijinal stop degil - bu durumu ayirt et ki yanlislikla "hata" gibi raporlanmasin.
    const breakeven = (sig.entryZoneTop + sig.entryZoneBottom) / 2;
    const movedToBreakeven = Math.abs(sig.stop - breakeven) < Math.abs(sig.stop - reconstructedOldStop) && stopDiffPct > 0.05;

    const newWickBuffer = atr15 * NEW_COEF;
    const newStop = bullish ? breakoutExtreme - newWickBuffer : breakoutExtreme + newWickBuffer;

    const oldRisk = bullish ? entry - sig.stop : sig.stop - entry;
    const newRisk = bullish ? entry - newStop : newStop - entry;
    const mainReward = bullish ? sig.tp2 - entry : entry - sig.tp2;
    const newRR = mainReward / newRisk;

    console.log(
      `  entry=${entry}  breakoutExtreme=${breakoutExtreme}  atr15m=${atr15.toFixed(6)}`,
    );
    const matchLabel = stopDiffPct < 0.05
      ? '(dogrulandi)'
      : movedToBreakeven
        ? '(DB stop TP1 sonrasi basabasa\'ya cekilmis - orijinal stop yerine yeniden hesaplanan deger kullaniliyor)'
        : '(UYUSMUYOR - kontrol et)';
    console.log(
      `  eski stop (DB)=${sig.stop}  yeniden hesaplanan orijinal stop=${reconstructedOldStop.toFixed(6)}  fark=${stopDiffPct.toFixed(4)}% ${matchLabel}`,
    );
    console.log(`  YENI stop (1.0 ATR)=${newStop.toFixed(6)}`);
    console.log(`  eski R:R (DB, tp2 bazli)=${sig.rr}  yeni R:R=${newRR.toFixed(2)}  (esik=${minRR})`);

    // Ileri yonlu simulasyon: triggeredAt'ten itibaren 15dk mumlarla, yeni stop'a mi
    // once deginiyor yoksa TP1/2/3'e mi - kronolojik sirayla kontrol ediliyor.
    const triggeredAt = sig.triggeredAt ?? sig.createdAt;
    let fwd: Candle[] = [];
    try {
      // "su ana kadar" veri cekmek icin endTime=now, limit genis tutuluyor
      const all = await fetchKlines(sig.symbol, '15m', Date.now(), 500);
      fwd = all.filter((c) => c.time >= triggeredAt.getTime());
    } catch (e) {
      console.log(`  HATA: ileri yon verisi cekilemedi: ${(e as Error).message}`);
      continue;
    }

    let stoppedOut = false;
    let hitTp1 = false, hitTp2 = false, hitTp3 = false;
    let stopTime: number | null = null;
    for (const c of fwd) {
      // Ayni mumda hem stop hem TP'ye deginilirse, konservatif varsayimla stop
      // once tetiklenmis kabul edilir (fitil ici sira bilinmiyor).
      const hitStop = bullish ? c.low <= newStop : c.high >= newStop;
      if (hitStop) {
        stoppedOut = true;
        stopTime = c.time;
        break;
      }
      if (bullish) {
        if (c.high >= sig.tp1) hitTp1 = true;
        if (c.high >= sig.tp2) hitTp2 = true;
        if (c.high >= sig.tp3) hitTp3 = true;
      } else {
        if (c.low <= sig.tp1) hitTp1 = true;
        if (c.low <= sig.tp2) hitTp2 = true;
        if (c.low <= sig.tp3) hitTp3 = true;
      }
    }

    let outcome: string;
    if (stoppedOut) outcome = 'HALA STOP';
    else if (hitTp3) outcome = 'KAZANDI (TP3)';
    else if (hitTp2) outcome = 'KAZANDI (TP2)';
    else if (hitTp1) outcome = 'KAZANDI (TP1)';
    else outcome = 'HENUZ BELIRSIZ';

    console.log(
      `  ileri pencere=${fwd.length * 15}dk (~${Math.round((fwd.length * 15) / 60)}sa)  =>  ${outcome}${stopTime ? '  (stop@' + new Date(stopTime).toISOString() + ')' : ''}`,
    );

    rows.push({
      symbol: sig.symbol,
      direction: sig.direction,
      eskiSonuc: sig.status,
      yeniSonuc: outcome,
      eskiRR: sig.rr,
      yeniRR: Math.round(newRR * 100) / 100,
      esikGecti: newRR >= minRR ? 'EVET' : 'HAYIR',
    });
  }

  console.log('\n' + '='.repeat(78));
  console.log('OZET TABLO\n');
  console.table(rows);

  const stillLost = rows.filter((r) => r.yeniSonuc === 'HALA STOP').length;
  const won = rows.filter((r) => r.yeniSonuc.startsWith('KAZANDI')).length;
  const pending = rows.filter((r) => r.yeniSonuc === 'HENUZ BELIRSIZ').length;
  console.log(`\nSonuc: ${won} kazandi, ${stillLost} hala stop oldu, ${pending} henuz belirsiz (${rows.length} sinyalden).`);
  const belowThreshold = rows.filter((r) => r.esikGecti === 'HAYIR').length;
  console.log(`R:R esigi (${minRR}): ${rows.length - belowThreshold}/${rows.length} sinyal hala esigi geciyor.`);

  await prisma.$disconnect();
})();
