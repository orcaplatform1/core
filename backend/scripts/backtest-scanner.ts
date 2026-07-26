/**
 * Bağımsız backtest scripti — src/scanner/scanner.service.ts içindeki buildSetup()
 * price action stratejisini geçmiş veride simüle eder.
 *
 * Canlı tarama koduna DOKUNMAZ: buildSetup() ve onun yardımcı fonksiyonları (ema,
 * atr, getTrend, findSwingHighs/Lows, hasBOS, findReversalCandle, toWeekly) buradan
 * okunup birebir aynı mantıkla kopyalanmıştır. Veritabanına yazmaz, sadece hesaplayıp
 * konsola basar.
 *
 * Metodoloji notları:
 * - Sembol listesi: fetchTopBinanceSymbols(200) ile AYNI yöntem (bugünün 24s hacme göre
 *   ilk 200 USDT paritesi, UP/DOWN kaldıraçlı tokenlar hariç). Bu, 6 ay önceki gerçek
 *   top-200 listesiyle birebir aynı olmayabilir (survivorship bias) — canlı kodun
 *   kullandığı yöntemin ta kendisi olduğu için bilinçli olarak böyle bırakıldı.
 * - Her sembol için ~250 günlük mum çekilir; son 183 günü (6 ay) "test penceresi"
 *   olarak yürütülür, öncesindeki ~67 gün sadece buildSetup'ın istediği 60+ mumluk
 *   geçmiş bağlamı (ve son-40-bar swing/ATR hesapları) için tampon olarak kullanılır.
 *   Böylece raporlanan 6 ayın TAMAMI sinyal üretebilir hale gelir.
 * - Her test günü için 4H trend, o güne kadarki (geleceğe bakmayan) son ~120 4H mumu
 *   üzerinden hesaplanır — canlı koddaki fetchBinance4h(symbol, 120) ile aynı pencere
 *   boyutu.
 * - fundingRate backtestte hep null geçilir: buildSetup içinde confirmedCount/strength/
 *   entry-stop-tp hesaplarını HİÇ etkilemiyor, sadece "reasons" metnine ekleniyor.
 * - Bir sinyal üretildiğinde giriş ANINDA (setup.entry fiyatından) pozisyona girilmiş
 *   varsayılır (WATCHING→TRIGGERED bekleme süresi modellenmez) — bu, stratejinin HAM
 *   sinyal kalitesini ölçmeyi basitleştirir.
 * - TP1 sonrası stop başabaşa çekilir (canlı koddaki updateTrackedSignals ile birebir
 *   aynı kural): TP1/TP2 bankalandıktan sonra fiyat başabaşa dönerse bu KAYIP sayılmaz,
 *   en son ulaşılan TP ile kapanır.
 * - R-multiple (expectancy), pozisyonun TAMAMININ ulaşılan son seviyede kapandığı
 *   basitleştirilmiş modelle hesaplanır (TP1'de "yarısını kapat" kısmi çıkışı ayrıca
 *   modellenmemiştir). HIT_STOP = -1R, HIT_TP1/2/3 = o seviyenin R karşılığı.
 * - "SURE_DOLDU" (zaman aşımı) sinyaller win-rate ve ortalama R hesabına DAHİL EDİLMEZ
 *   (henüz sonuçlanmamış işlem sayılır) — bu da canlı koddaki getTrackedSignals()'ın
 *   winRate hesabıyla aynı yaklaşım (sadece kapanmış işlemler oran hesabına girer).
 *
 * Çalıştırma:
 *   npx ts-node scripts/backtest-scanner.ts
 */

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Setup {
  direction: 'LONG' | 'SHORT';
  currentPrice: number;
  entry: number;
  entryZoneTop: number;
  entryZoneBottom: number;
  stop: number;
  tp1: number;
  tp2: number;
  tp3: number;
  rr: number;
  reasons: string[];
  confidenceScore: number;
  confirmedCount: number;
  strength: 'GUCLU' | 'ORTA' | 'RISKLI';
  stillValid: boolean;
  distancePercent: number;
}

// ============================================================
// scanner.service.ts'ten BİREBİR kopyalanan saf (side-effect'siz) mantık
// ============================================================

function toWeekly(daily: Candle[]): Candle[] {
  const weekly: Candle[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    if (chunk.length === 0) continue;
    weekly.push({
      time: chunk[0].time, open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((s, c) => s + c.volume, 0),
    });
  }
  return weekly;
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function atr(candles: Candle[], period = 14): number {
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)));
  }
  const recent = trs.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

function getTrend(candles: Candle[]): 'UP' | 'DOWN' | 'FLAT' {
  if (candles.length < 10) return 'FLAT';
  const closes = candles.map((c) => c.close);
  const ema50 = ema(closes, Math.min(50, closes.length - 1));
  const ema200 = ema(closes, Math.min(200, closes.length - 1));
  const last50 = ema50[ema50.length - 1];
  const last200 = ema200[ema200.length - 1];
  if (last50 > last200 * 1.002) return 'UP';
  if (last50 < last200 * 0.998) return 'DOWN';
  return 'FLAT';
}

function findSwingHighs(candles: Candle[], lookback = 3): number[] {
  const indices: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const window = candles.slice(i - lookback, i + lookback + 1);
    if (window.every((c) => c.high <= candles[i].high)) indices.push(i);
  }
  return indices;
}

function findSwingLows(candles: Candle[], lookback = 3): number[] {
  const indices: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const window = candles.slice(i - lookback, i + lookback + 1);
    if (window.every((c) => c.low >= candles[i].low)) indices.push(i);
  }
  return indices;
}

function hasBOS(candles: Candle[], direction: 'LONG' | 'SHORT'): boolean {
  const highs = findSwingHighs(candles);
  const lows = findSwingLows(candles);
  const lastClose = candles[candles.length - 1].close;
  if (direction === 'LONG' && highs.length >= 1) {
    return lastClose > candles[highs[highs.length - 1]].high;
  }
  if (direction === 'SHORT' && lows.length >= 1) {
    return lastClose < candles[lows[lows.length - 1]].low;
  }
  return false;
}

function findReversalCandle(
  candles: Candle[],
  atrValue: number,
  levelPrice: number,
  bullish: boolean,
): { index: number; low: number; high: number; open: number; close: number } | null {
  const proximityBuffer = atrValue * 1.0;
  const lookback = Math.min(5, candles.length - 1);
  for (let i = candles.length - 1; i >= candles.length - lookback; i--) {
    const c = candles[i];
    const prev = candles[i - 1];
    if (!prev) continue;
    const range = c.high - c.low;
    if (range <= 0) continue;
    const body = Math.abs(c.close - c.open);
    const avgVolume = candles.slice(Math.max(0, i - 20), i).reduce((s, x) => s + x.volume, 0) / Math.min(20, i);
    const volumeConfirmed = avgVolume > 0 ? c.volume > avgVolume * 1.1 : true;

    if (bullish) {
      const nearLevel = c.low <= levelPrice + proximityBuffer && c.low >= levelPrice - proximityBuffer;
      if (!nearLevel) continue;
      const isBullishClose = c.close > c.open;
      const lowerWick = Math.min(c.open, c.close) - c.low;
      const isPinBar = lowerWick >= body * 1.5 && c.close > c.low + range * 0.5;
      const isEngulfing = c.close > c.open && c.close > prev.open && c.open < prev.close && prev.close < prev.open;
      if (isBullishClose && (isPinBar || isEngulfing) && volumeConfirmed) {
        return { index: i, low: c.low, high: c.high, open: c.open, close: c.close };
      }
    } else {
      const nearLevel = c.high <= levelPrice + proximityBuffer && c.high >= levelPrice - proximityBuffer;
      if (!nearLevel) continue;
      const isBearishClose = c.close < c.open;
      const upperWick = c.high - Math.max(c.open, c.close);
      const isPinBar = upperWick >= body * 1.5 && c.close < c.high - range * 0.5;
      const isEngulfing = c.close < c.open && c.close < prev.open && c.open > prev.close && prev.close > prev.open;
      if (isBearishClose && (isPinBar || isEngulfing) && volumeConfirmed) {
        return { index: i, low: c.low, high: c.high, open: c.open, close: c.close };
      }
    }
  }
  return null;
}

function buildSetup(
  dailyCandles: Candle[],
  trend4h: 'UP' | 'DOWN' | 'FLAT',
  weeklyCandles: Candle[],
  fundingRate: number | null,
): Setup | null {
  if (dailyCandles.length < 60) return null;
  const trendDaily = getTrend(dailyCandles);
  if (trendDaily === 'FLAT') return null;
  const direction: 'LONG' | 'SHORT' = trendDaily === 'UP' ? 'LONG' : 'SHORT';
  const bullish = direction === 'LONG';
  const atrValue = atr(dailyCandles);
  const swingHighs = findSwingHighs(dailyCandles);
  const swingLows = findSwingLows(dailyCandles);

  const htfBiasConfirmed = trendDaily === trend4h;

  const recentSwingIndices = bullish
    ? swingLows.filter((i) => i >= dailyCandles.length - 40)
    : swingHighs.filter((i) => i >= dailyCandles.length - 40);
  if (recentSwingIndices.length === 0) return null;
  const levelIndex = recentSwingIndices[recentSwingIndices.length - 1];
  const levelPrice = bullish ? dailyCandles[levelIndex].low : dailyCandles[levelIndex].high;
  const lastCandle = dailyCandles[dailyCandles.length - 1];
  const distanceToLevel = Math.abs(lastCandle.close - levelPrice);
  const atLevelConfirmed = distanceToLevel <= atrValue * 1.5;

  const reversalCandle = findReversalCandle(dailyCandles, atrValue, levelPrice, bullish);
  const reversalConfirmed = reversalCandle !== null;

  const mssConfirmed = hasBOS(dailyCandles, direction);

  if (!atLevelConfirmed || !reversalConfirmed || !reversalCandle) return null;

  const confirmedCount = [htfBiasConfirmed, atLevelConfirmed, reversalConfirmed, mssConfirmed].filter(Boolean).length;
  if (confirmedCount < 3) return null;

  const entryZoneTop = Math.max(reversalCandle.open, reversalCandle.close);
  const entryZoneBottom = Math.min(reversalCandle.open, reversalCandle.close);
  const entry = (entryZoneTop + entryZoneBottom) / 2;

  const stillValid = lastCandle.close <= entryZoneTop && lastCandle.close >= entryZoneBottom;
  let distancePercent = 0;
  if (lastCandle.close > entryZoneTop) {
    distancePercent = ((lastCandle.close - entryZoneTop) / entryZoneTop) * 100;
  } else if (lastCandle.close < entryZoneBottom) {
    distancePercent = ((entryZoneBottom - lastCandle.close) / entryZoneBottom) * 100;
  }
  distancePercent = Math.round(distancePercent * 100) / 100;
  if (!stillValid && distancePercent > 5) return null;

  const wickBuffer = atrValue * 0.15;
  let stop: number;
  if (bullish) {
    const structuralStops = swingLows
      .map((i) => dailyCandles[i].low)
      .filter((l) => l < entryZoneBottom)
      .sort((a, b) => b - a);
    stop = structuralStops.length > 0 ? structuralStops[0] - wickBuffer : reversalCandle.low - wickBuffer;
  } else {
    const structuralStops = swingHighs
      .map((i) => dailyCandles[i].high)
      .filter((h) => h > entryZoneTop)
      .sort((a, b) => a - b);
    stop = structuralStops.length > 0 ? structuralStops[0] + wickBuffer : reversalCandle.high + wickBuffer;
  }
  const risk = Math.abs(entry - stop);

  const tp1 = bullish ? entry + risk * 1.5 : entry - risk * 1.5;

  let structuralLevels: number[];
  if (bullish) {
    structuralLevels = swingHighs
      .map((i) => dailyCandles[i].high)
      .filter((h) => h > tp1)
      .sort((a, b) => a - b);
  } else {
    structuralLevels = swingLows
      .map((i) => dailyCandles[i].low)
      .filter((l) => l < tp1)
      .sort((a, b) => b - a);
  }
  if (structuralLevels.length < 2) return null;

  const [tp2, tp3] = structuralLevels;
  const mainReward = Math.abs(tp2 - entry);
  const rr = risk > 0 ? mainReward / risk : 0;

  const reasons: string[] = [];
  const strength: 'GUCLU' | 'ORTA' | 'RISKLI' =
    confirmedCount === 4 ? 'GUCLU' : confirmedCount === 3 ? 'ORTA' : 'RISKLI';
  const confidenceScore = confirmedCount * 25;

  return {
    direction, currentPrice: lastCandle.close, entry, entryZoneTop, entryZoneBottom, stop, tp1, tp2, tp3,
    rr: Math.round(rr * 100) / 100, reasons, confidenceScore,
    confirmedCount, strength, stillValid, distancePercent,
  };
}

// ============================================================
// Binance veri çekme (fetchTopBinanceSymbols / fetchBinanceDaily / fetchBinance4h
// ile aynı davranış, backtest için gereken uzunlukta + sayfalanmış)
// ============================================================

async function fetchTopBinanceSymbols(limit: number): Promise<string[]> {
  const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
  if (!res.ok) return [];
  const data = await res.json();
  return data
    .filter((t: any) => t.symbol.endsWith('USDT') && !t.symbol.includes('UPUSDT') && !t.symbol.includes('DOWNUSDT'))
    .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, limit)
    .map((t: any) => t.symbol);
}

/** Binance kline limiti 1000 ile sınırlı — gerekirse endTime ile geriye sayfalar. */
async function fetchBinanceKlines(symbol: string, interval: string, totalNeeded: number): Promise<Candle[]> {
  let all: any[] = [];
  let endTime: number | undefined;
  while (all.length < totalNeeded) {
    const batchLimit = Math.min(1000, totalNeeded - all.length);
    let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${batchLimit}`;
    if (endTime) url += `&endTime=${endTime}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    all = [...data, ...all];
    endTime = data[0][0] - 1;
    if (data.length < batchLimit) break;
  }
  // Son eleman henüz kapanmamış (oluşan) mum olabilir — canlı koddaki gibi at
  const closed = all.slice(0, -1);
  return closed.map((c: any) => ({
    time: c[0], open: parseFloat(c[1]), high: parseFloat(c[2]),
    low: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5]),
  }));
}

function get4hWindowEndingAt(h4Candles: Candle[], cutoffTime: number, windowSize = 120): Candle[] {
  const upToCutoff = h4Candles.filter((c) => c.time <= cutoffTime);
  return upToCutoff.slice(-windowSize);
}

// ============================================================
// Backtest çekirdeği
// ============================================================

const DAILY_WINDOW_DAYS = 183; // "son 6 ay" raporlama penceresi
const LOOKBACK_BUFFER_DAYS = 70; // buildSetup'ın 60+ mum ihtiyacı için ek geçmiş
const DAILY_TOTAL = DAILY_WINDOW_DAYS + LOOKBACK_BUFFER_DAYS;
const FOUR_HOUR_TOTAL = DAILY_TOTAL * 6 + 120; // aynı takvim aralığı + rolling pencere payı

type Outcome = 'HIT_TP1' | 'HIT_TP2' | 'HIT_TP3' | 'HIT_STOP' | 'SURE_DOLDU';

interface SignalResult {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  strength: 'GUCLU' | 'ORTA' | 'RISKLI';
  confirmedCount: number;
  entryDate: string;
  outcome: Outcome;
  daysHeld: number;
  rMultiple: number | null; // null => SURE_DOLDU, expectancy hesabına girmez
}

function simulateOutcome(
  dailyCandles: Candle[],
  signalIndex: number,
  setup: Setup,
): { outcome: Outcome; daysHeld: number; rMultiple: number | null } {
  const bullish = setup.direction === 'LONG';
  const risk = Math.abs(setup.entry - setup.stop);
  let currentStop = setup.stop;
  let bankedTp: 0 | 1 | 2 | 3 = 0;

  for (let j = signalIndex + 1; j < dailyCandles.length; j++) {
    const f = dailyCandles[j];

    const hitStopNow = bullish ? f.low <= currentStop : f.high >= currentStop;
    if (hitStopNow) {
      const daysHeld = j - signalIndex;
      if (bankedTp === 0) return { outcome: 'HIT_STOP', daysHeld, rMultiple: -1 };
      const outcome: Outcome = bankedTp === 1 ? 'HIT_TP1' : bankedTp === 2 ? 'HIT_TP2' : 'HIT_TP3';
      const level = bankedTp === 1 ? setup.tp1 : bankedTp === 2 ? setup.tp2 : setup.tp3;
      return { outcome, daysHeld, rMultiple: Math.abs(level - setup.entry) / risk };
    }

    const hitTp3 = bullish ? f.high >= setup.tp3 : f.low <= setup.tp3;
    if (hitTp3) {
      return { outcome: 'HIT_TP3', daysHeld: j - signalIndex, rMultiple: Math.abs(setup.tp3 - setup.entry) / risk };
    }
    const hitTp2 = bullish ? f.high >= setup.tp2 : f.low <= setup.tp2;
    if (hitTp2 && bankedTp < 2) bankedTp = 2;
    const hitTp1 = bullish ? f.high >= setup.tp1 : f.low <= setup.tp1;
    if (hitTp1 && bankedTp < 1) {
      bankedTp = 1;
      currentStop = setup.entry; // TP1 sonrası stop başabaşa (canlı koddaki kural)
    }
  }

  // Veri bitti, hiçbir seviyeye kesin ulaşmadan / son bankalanan seviyede
  const daysHeld = (dailyCandles.length - 1) - signalIndex;
  if (bankedTp === 0) return { outcome: 'SURE_DOLDU', daysHeld, rMultiple: null };
  const outcome: Outcome = bankedTp === 1 ? 'HIT_TP1' : 'HIT_TP2';
  const level = bankedTp === 1 ? setup.tp1 : setup.tp2;
  return { outcome, daysHeld, rMultiple: Math.abs(level - setup.entry) / risk };
}

async function backtestSymbol(symbol: string): Promise<SignalResult[]> {
  const [daily, h4] = await Promise.all([
    fetchBinanceKlines(symbol, '1d', DAILY_TOTAL),
    fetchBinanceKlines(symbol, '4h', FOUR_HOUR_TOTAL),
  ]);
  if (daily.length < LOOKBACK_BUFFER_DAYS + 60 || h4.length < 120) return [];

  const results: SignalResult[] = [];
  const windowStart = Math.max(60, daily.length - DAILY_WINDOW_DAYS);

  for (let i = windowStart; i < daily.length; i++) {
    const slice = daily.slice(0, i + 1);
    const trend4h = getTrend(get4hWindowEndingAt(h4, slice[slice.length - 1].time));
    const weekly = toWeekly(slice);
    const setup = buildSetup(slice, trend4h, weekly, null);
    if (!setup) continue;

    const { outcome, daysHeld, rMultiple } = simulateOutcome(daily, i, setup);
    results.push({
      symbol,
      direction: setup.direction,
      strength: setup.strength,
      confirmedCount: setup.confirmedCount,
      entryDate: new Date(daily[i].time).toISOString().slice(0, 10),
      outcome,
      daysHeld,
      rMultiple,
    });
  }
  return results;
}

// ============================================================
// Rapor
// ============================================================

function computeStats(signals: SignalResult[]) {
  const total = signals.length;
  const tp1 = signals.filter((s) => s.outcome === 'HIT_TP1').length;
  const tp2 = signals.filter((s) => s.outcome === 'HIT_TP2').length;
  const tp3 = signals.filter((s) => s.outcome === 'HIT_TP3').length;
  const stop = signals.filter((s) => s.outcome === 'HIT_STOP').length;
  const timeout = signals.filter((s) => s.outcome === 'SURE_DOLDU').length;

  const resolved = signals.filter((s) => s.rMultiple !== null);
  const wins = tp1 + tp2 + tp3;
  const losses = stop;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : null;
  const avgR = resolved.length > 0
    ? resolved.reduce((sum, s) => sum + (s.rMultiple as number), 0) / resolved.length
    : null;
  const avgDaysHeld = signals.length > 0
    ? signals.reduce((sum, s) => sum + s.daysHeld, 0) / signals.length
    : null;

  return { total, tp1, tp2, tp3, stop, timeout, winRate, avgR, avgDaysHeld, resolvedCount: resolved.length };
}

function printReport(label: string, signals: SignalResult[]) {
  const s = computeStats(signals);
  console.log(`\n=== ${label} ===`);
  console.log(`Toplam sinyal:        ${s.total}`);
  console.log(`  TP1'de kapandı:     ${s.tp1}`);
  console.log(`  TP2'de kapandı:     ${s.tp2}`);
  console.log(`  TP3'e ulaştı:       ${s.tp3}`);
  console.log(`  Stop oldu:          ${s.stop}`);
  console.log(`  Süre doldu (açık):  ${s.timeout}`);
  console.log(`Kazanma oranı:        ${s.winRate !== null ? s.winRate.toFixed(1) + '%' : 'yetersiz veri'}  (sonuçlanan ${s.resolvedCount} işlem üzerinden)`);
  console.log(`Ortalama R (expect.): ${s.avgR !== null ? (s.avgR >= 0 ? '+' : '') + s.avgR.toFixed(2) + 'R' : 'yetersiz veri'}`);
  console.log(`Ort. gün (sonuçlanan): ${s.avgDaysHeld !== null ? s.avgDaysHeld.toFixed(1) : '-'}`);
}

async function main() {
  console.log(`ORCA Scanner Backtest — buildSetup() price action stratejisi, son ${DAILY_WINDOW_DAYS} gün (6 ay)\n`);
  console.log('Sembol listesi çekiliyor (top 200 USDT paritesi, bugünün 24s hacmine göre)...');
  const symbols = await fetchTopBinanceSymbols(200);
  console.log(`${symbols.length} sembol bulundu. Backtest başlıyor...\n`);

  const allSignals: SignalResult[] = [];
  let processed = 0;

  for (const symbol of symbols) {
    try {
      const signals = await backtestSymbol(symbol);
      allSignals.push(...signals);
    } catch (err) {
      console.log(`  [atlandı] ${symbol}: ${(err as Error).message}`);
    }
    processed++;
    if (processed % 20 === 0 || processed === symbols.length) {
      console.log(`  ${processed}/${symbols.length} sembol işlendi, şu ana kadar ${allSignals.length} sinyal bulundu...`);
    }
    // Binance rate limit'e takılmamak için canlı koddaki gibi kısa bekleme
    await new Promise((r) => setTimeout(r, 150));
  }

  const guclu = allSignals.filter((s) => s.strength === 'GUCLU');
  const orta = allSignals.filter((s) => s.strength === 'ORTA');

  console.log('\n\n############################################');
  console.log('#              BACKTEST SONUÇLARI          #');
  console.log('############################################');
  printReport('TÜM SİNYALLER', allSignals);
  printReport('GÜÇLÜ (4/4 confirmed)', guclu);
  printReport('ORTA (3/4 confirmed)', orta);

  console.log('\n=== GÜÇLÜ (4/4) sinyallerin tek tek dökümü ===');
  for (const s of guclu) {
    console.log(`  ${s.symbol.padEnd(12)} ${s.direction.padEnd(6)} ${s.entryDate}  -> ${s.outcome}  (${s.daysHeld} gün)`);
  }

  console.log('\nNot: R-multiple hesaplaması pozisyonun tamamının ulaşılan son seviyede');
  console.log('kapandığı basitleştirilmiş modelle yapılmıştır (TP1\'de kısmi kâr alma');
  console.log('ayrıca modellenmemiştir). "Süre doldu" sinyaller kazanma oranı ve ortalama');
  console.log('R hesabına dahil edilmemiştir (henüz sonuçlanmamış açık işlem sayılır).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
