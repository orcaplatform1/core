/**
 * Bağımsız backtest scripti — YENİ bir mean-reversion (aşırı alım/satım bölgelerinden
 * geri dönüş) strateji varyantını, mevcut price action stratejisiyle (buildSetup(),
 * src/scanner/scanner.service.ts) aynı veri ve aynı ölçüm yöntemiyle karşılaştırır.
 *
 * Canlı tarama koduna VE buildSetup()'a DOKUNMAZ. buildSetup() ve yardımcıları burada
 * scripts/backtest-scanner.ts'ten BİREBİR aynı şekilde tekrar kopyalanmıştır — tesadüf
 * değil: iki strateji AYNI sembol listesi + AYNI çekilen veri üzerinde, TEK bir taramada
 * yan yana koşturulup karşılaştırılıyor ki sonuçlar gerçekten birebir karşılaştırılabilir
 * olsun (iki ayrı script çalıştırıp farklı anlarda çekilen top-200 listelerini kıyaslamak
 * yerine). Veritabanına yazmaz, sadece hesaplayıp konsola basar.
 *
 * Mean-reversion strateji mantığı:
 * - RSI(14, Wilder smoothing) hesaplanır.
 * - Aşırı bölge şartı ("i-1" mumunda): LONG için RSI < 30 VE close, 20-EMA'nın en az
 *   1.5 ATR ALTINDA (sıradan dalgalanma değil, gerçek bir sapma). SHORT için simetriği:
 *   RSI > 70 VE close, 20-EMA'nın en az 1.5 ATR ÜSTÜNDE.
 * - Giriş/sinyal mumu ("i"): RSI dönüşe başlamış (LONG: rsi[i] > rsi[i-1], SHORT:
 *   rsi[i] < rsi[i-1]) — entry, bu mumun kapanışı.
 * - Stop: son 3 mumun en düşük/en yüksek noktasının 0.1 ATR ötesi (dar stop).
 * - TP: TEK hedef — sinyal anındaki 20-EMA seviyesinin kendisi (ortalamaya dönüş).
 *   EMA canlı takip edilmez, giriş anında SABİTLENİR (aksi halde ileri-bakışsız/
 *   tekrarlanabilir bir hedef tanımlamak mümkün olmazdı) — bu bilinçli bir basitleştirme.
 * - Price action'daki GUCLU/ORTA gibi bir güven kademesi bu stratejide YOK (istenmedi);
 *   tek bir toplu sonuç seti üretilir.
 *
 * Sonuç ölçme yöntemi backtest-scanner.ts ile aynı: stop günlük OHLC ile önce kontrol
 * edilir (aynı bar içinde hem stop hem hedef değince stop kazanır — codebase'deki
 * computeHistoricalWinRate ile aynı konservatif kural), R-multiple = HIT_STOP için -1,
 * HIT_TP için hedefin R karşılığı, "süre doldu" (SURE_DOLDU) sinyaller win-rate/ortalama
 * R hesabına DAHİL EDİLMEZ (henüz sonuçlanmamış açık işlem sayılır).
 *
 * Çalıştırma:
 *   npx ts-node scripts/backtest-mean-reversion.ts
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
  confirmedCount: number;
  strength: 'GUCLU' | 'ORTA' | 'RISKLI';
  stillValid: boolean;
  distancePercent: number;
}

// ============================================================
// scanner.service.ts / backtest-scanner.ts'ten BİREBİR kopyalanan ortak mantık
// (price action stratejisini de aynı taramada koşturabilmek için gerekli)
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

  const strength: 'GUCLU' | 'ORTA' | 'RISKLI' =
    confirmedCount === 4 ? 'GUCLU' : confirmedCount === 3 ? 'ORTA' : 'RISKLI';

  return {
    direction, currentPrice: lastCandle.close, entry, entryZoneTop, entryZoneBottom, stop, tp1, tp2, tp3,
    rr: Math.round(rr * 100) / 100, confirmedCount, strength, stillValid, distancePercent,
  };
}

// ============================================================
// YENİ: Mean-reversion stratejisi
// ============================================================

interface MRSetup {
  direction: 'LONG' | 'SHORT';
  entry: number;
  stop: number;
  target: number;
}

/** Wilder RSI(period). İlk `period` bar NaN döner (ısınma periyodu). */
function rsi(candles: Candle[], period = 14): number[] {
  const closes = candles.map((c) => c.close);
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return result;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gainSum += change; else lossSum -= change;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

function buildMeanReversionSetup(dailyCandles: Candle[]): MRSetup | null {
  const i = dailyCandles.length - 1;
  if (i < 25) return null; // RSI14 + EMA20 ısınması + i-1 bakışı için yeterli geçmiş

  const closes = dailyCandles.map((c) => c.close);
  const rsiSeries = rsi(dailyCandles, 14);
  const ema20Series = ema(closes, 20);
  const atrValue = atr(dailyCandles, 14);
  if (Number.isNaN(rsiSeries[i]) || Number.isNaN(rsiSeries[i - 1]) || atrValue <= 0) return null;

  const prevRsi = rsiSeries[i - 1];
  const curRsi = rsiSeries[i];
  const prevClose = dailyCandles[i - 1].close;
  const prevEma = ema20Series[i - 1];

  const oversold = prevRsi < 30 && prevClose < prevEma - atrValue * 1.5;
  const overbought = prevRsi > 70 && prevClose > prevEma + atrValue * 1.5;

  let direction: 'LONG' | 'SHORT' | null = null;
  if (oversold && curRsi > prevRsi) direction = 'LONG';
  else if (overbought && curRsi < prevRsi) direction = 'SHORT';
  if (!direction) return null;

  const bullish = direction === 'LONG';
  const entry = dailyCandles[i].close;
  const lookbackCandles = dailyCandles.slice(Math.max(0, i - 2), i + 1); // son 3 mum
  const wickBuffer = atrValue * 0.1;
  const stop = bullish
    ? Math.min(...lookbackCandles.map((c) => c.low)) - wickBuffer
    : Math.max(...lookbackCandles.map((c) => c.high)) + wickBuffer;
  const target = ema20Series[i]; // giriş anında sabitlenmiş "ortalamaya dönüş" hedefi

  const risk = Math.abs(entry - stop);
  if (risk <= 0) return null;
  if (bullish && target <= entry) return null;
  if (!bullish && target >= entry) return null;

  return { direction, entry, stop, target };
}

// ============================================================
// Binance veri çekme (backtest-scanner.ts ile birebir aynı)
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

const DAILY_WINDOW_DAYS = 183; // "son 6 ay"
const LOOKBACK_BUFFER_DAYS = 70;
const DAILY_TOTAL = DAILY_WINDOW_DAYS + LOOKBACK_BUFFER_DAYS;
const FOUR_HOUR_TOTAL = DAILY_TOTAL * 6 + 120;

type Outcome = 'HIT_TP1' | 'HIT_TP2' | 'HIT_TP3' | 'HIT_STOP' | 'SURE_DOLDU';
type MROutcome = 'HIT_TP' | 'HIT_STOP' | 'SURE_DOLDU';

interface PaSignalResult {
  symbol: string;
  strength: 'GUCLU' | 'ORTA' | 'RISKLI';
  outcome: Outcome;
  daysHeld: number;
  rMultiple: number | null;
}

interface MrSignalResult {
  symbol: string;
  outcome: MROutcome;
  daysHeld: number;
  rMultiple: number | null;
}

/** Price action sonuç simülasyonu — backtest-scanner.ts ile birebir aynı (TP1 sonrası
 * stop başabaşa, en son bankalanan TP'de kapanış). */
function simulatePaOutcome(dailyCandles: Candle[], signalIndex: number, setup: Setup) {
  const bullish = setup.direction === 'LONG';
  const risk = Math.abs(setup.entry - setup.stop);
  let currentStop = setup.stop;
  let bankedTp: 0 | 1 | 2 | 3 = 0;

  for (let j = signalIndex + 1; j < dailyCandles.length; j++) {
    const f = dailyCandles[j];
    const hitStopNow = bullish ? f.low <= currentStop : f.high >= currentStop;
    if (hitStopNow) {
      const daysHeld = j - signalIndex;
      if (bankedTp === 0) return { outcome: 'HIT_STOP' as Outcome, daysHeld, rMultiple: -1 };
      const outcome: Outcome = bankedTp === 1 ? 'HIT_TP1' : bankedTp === 2 ? 'HIT_TP2' : 'HIT_TP3';
      const level = bankedTp === 1 ? setup.tp1 : bankedTp === 2 ? setup.tp2 : setup.tp3;
      return { outcome, daysHeld, rMultiple: Math.abs(level - setup.entry) / risk };
    }
    const hitTp3 = bullish ? f.high >= setup.tp3 : f.low <= setup.tp3;
    if (hitTp3) return { outcome: 'HIT_TP3' as Outcome, daysHeld: j - signalIndex, rMultiple: Math.abs(setup.tp3 - setup.entry) / risk };
    const hitTp2 = bullish ? f.high >= setup.tp2 : f.low <= setup.tp2;
    if (hitTp2 && bankedTp < 2) bankedTp = 2;
    const hitTp1 = bullish ? f.high >= setup.tp1 : f.low <= setup.tp1;
    if (hitTp1 && bankedTp < 1) { bankedTp = 1; currentStop = setup.entry; }
  }
  const daysHeld = (dailyCandles.length - 1) - signalIndex;
  if (bankedTp === 0) return { outcome: 'SURE_DOLDU' as Outcome, daysHeld, rMultiple: null };
  const outcome: Outcome = bankedTp === 1 ? 'HIT_TP1' : 'HIT_TP2';
  const level = bankedTp === 1 ? setup.tp1 : setup.tp2;
  return { outcome, daysHeld, rMultiple: Math.abs(level - setup.entry) / risk };
}

/** Mean-reversion sonuç simülasyonu — tek hedef, kısmi bankalama/başabaş kuralı yok. */
function simulateMrOutcome(dailyCandles: Candle[], signalIndex: number, setup: MRSetup) {
  const bullish = setup.direction === 'LONG';
  const risk = Math.abs(setup.entry - setup.stop);

  for (let j = signalIndex + 1; j < dailyCandles.length; j++) {
    const f = dailyCandles[j];
    const hitStop = bullish ? f.low <= setup.stop : f.high >= setup.stop;
    if (hitStop) return { outcome: 'HIT_STOP' as MROutcome, daysHeld: j - signalIndex, rMultiple: -1 };
    const hitTarget = bullish ? f.high >= setup.target : f.low <= setup.target;
    if (hitTarget) {
      return { outcome: 'HIT_TP' as MROutcome, daysHeld: j - signalIndex, rMultiple: Math.abs(setup.target - setup.entry) / risk };
    }
  }
  return { outcome: 'SURE_DOLDU' as MROutcome, daysHeld: (dailyCandles.length - 1) - signalIndex, rMultiple: null };
}

async function backtestSymbol(symbol: string): Promise<{ pa: PaSignalResult[]; mr: MrSignalResult[] }> {
  const [daily, h4] = await Promise.all([
    fetchBinanceKlines(symbol, '1d', DAILY_TOTAL),
    fetchBinanceKlines(symbol, '4h', FOUR_HOUR_TOTAL),
  ]);
  if (daily.length < LOOKBACK_BUFFER_DAYS + 60 || h4.length < 120) return { pa: [], mr: [] };

  const pa: PaSignalResult[] = [];
  const mr: MrSignalResult[] = [];
  const windowStart = Math.max(60, daily.length - DAILY_WINDOW_DAYS);

  for (let i = windowStart; i < daily.length; i++) {
    const slice = daily.slice(0, i + 1);

    const trend4h = getTrend(get4hWindowEndingAt(h4, slice[slice.length - 1].time));
    const paSetup = buildSetup(slice, trend4h);
    if (paSetup) {
      const res = simulatePaOutcome(daily, i, paSetup);
      pa.push({ symbol, strength: paSetup.strength, outcome: res.outcome, daysHeld: res.daysHeld, rMultiple: res.rMultiple });
    }

    const mrSetup = buildMeanReversionSetup(slice);
    if (mrSetup) {
      const res = simulateMrOutcome(daily, i, mrSetup);
      mr.push({ symbol, outcome: res.outcome, daysHeld: res.daysHeld, rMultiple: res.rMultiple });
    }
  }
  return { pa, mr };
}

// ============================================================
// Rapor
// ============================================================

function computeStats(rMultiples: (number | null)[], outcomeCounts: Record<string, number>, totalSignals: number, days: number[]) {
  const resolved = rMultiples.filter((r): r is number => r !== null);
  const avgR = resolved.length > 0 ? resolved.reduce((a, b) => a + b, 0) / resolved.length : null;
  const avgDays = days.length > 0 ? days.reduce((a, b) => a + b, 0) / days.length : null;
  return { total: totalSignals, avgR, avgDays, resolvedCount: resolved.length, outcomeCounts };
}

function printPaReport(label: string, signals: PaSignalResult[]) {
  const tp1 = signals.filter((s) => s.outcome === 'HIT_TP1').length;
  const tp2 = signals.filter((s) => s.outcome === 'HIT_TP2').length;
  const tp3 = signals.filter((s) => s.outcome === 'HIT_TP3').length;
  const stop = signals.filter((s) => s.outcome === 'HIT_STOP').length;
  const timeout = signals.filter((s) => s.outcome === 'SURE_DOLDU').length;
  const wins = tp1 + tp2 + tp3;
  const winRate = wins + stop > 0 ? (wins / (wins + stop)) * 100 : null;
  const stats = computeStats(signals.map((s) => s.rMultiple), {}, signals.length, signals.map((s) => s.daysHeld));

  console.log(`\n=== ${label} ===`);
  console.log(`Toplam sinyal:        ${stats.total}`);
  console.log(`  TP1'de kapandı:     ${tp1}`);
  console.log(`  TP2'de kapandı:     ${tp2}`);
  console.log(`  TP3'e ulaştı:       ${tp3}`);
  console.log(`  Stop oldu:          ${stop}`);
  console.log(`  Süre doldu (açık):  ${timeout}`);
  console.log(`Kazanma oranı:        ${winRate !== null ? winRate.toFixed(1) + '%' : 'yetersiz veri'}  (sonuçlanan ${wins + stop} işlem üzerinden)`);
  console.log(`Ortalama R (expect.): ${stats.avgR !== null ? (stats.avgR >= 0 ? '+' : '') + stats.avgR.toFixed(2) + 'R' : 'yetersiz veri'}`);
  console.log(`Ort. gün (sonuçlanan): ${stats.avgDays !== null ? stats.avgDays.toFixed(1) : '-'}`);
  return { total: stats.total, winRate, avgR: stats.avgR, avgDays: stats.avgDays };
}

function printMrReport(label: string, signals: MrSignalResult[]) {
  const tp = signals.filter((s) => s.outcome === 'HIT_TP').length;
  const stop = signals.filter((s) => s.outcome === 'HIT_STOP').length;
  const timeout = signals.filter((s) => s.outcome === 'SURE_DOLDU').length;
  const winRate = tp + stop > 0 ? (tp / (tp + stop)) * 100 : null;
  const stats = computeStats(signals.map((s) => s.rMultiple), {}, signals.length, signals.map((s) => s.daysHeld));

  console.log(`\n=== ${label} ===`);
  console.log(`Toplam sinyal:        ${stats.total}`);
  console.log(`  Hedefe ulaştı:      ${tp}`);
  console.log(`  Stop oldu:          ${stop}`);
  console.log(`  Süre doldu (açık):  ${timeout}`);
  console.log(`Kazanma oranı:        ${winRate !== null ? winRate.toFixed(1) + '%' : 'yetersiz veri'}  (sonuçlanan ${tp + stop} işlem üzerinden)`);
  console.log(`Ortalama R (expect.): ${stats.avgR !== null ? (stats.avgR >= 0 ? '+' : '') + stats.avgR.toFixed(2) + 'R' : 'yetersiz veri'}`);
  console.log(`Ort. gün (sonuçlanan): ${stats.avgDays !== null ? stats.avgDays.toFixed(1) : '-'}`);
  return { total: stats.total, winRate, avgR: stats.avgR, avgDays: stats.avgDays };
}

async function main() {
  console.log(`ORCA Scanner Backtest — Mean-Reversion vs Price Action, son ${DAILY_WINDOW_DAYS} gün (6 ay)\n`);
  console.log('Sembol listesi çekiliyor (top 200 USDT paritesi, bugünün 24s hacmine göre)...');
  const symbols = await fetchTopBinanceSymbols(200);
  console.log(`${symbols.length} sembol bulundu. Backtest başlıyor (her sembolde iki strateji de aynı veri üzerinde koşuyor)...\n`);

  const allPa: PaSignalResult[] = [];
  const allMr: MrSignalResult[] = [];
  let processed = 0;

  for (const symbol of symbols) {
    try {
      const { pa, mr } = await backtestSymbol(symbol);
      allPa.push(...pa);
      allMr.push(...mr);
    } catch (err) {
      console.log(`  [atlandı] ${symbol}: ${(err as Error).message}`);
    }
    processed++;
    if (processed % 20 === 0 || processed === symbols.length) {
      console.log(`  ${processed}/${symbols.length} sembol işlendi — Price Action: ${allPa.length} sinyal, Mean-Reversion: ${allMr.length} sinyal...`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log('\n\n############################################');
  console.log('#     PRICE ACTION (trend-takip, buildSetup) #');
  console.log('############################################');
  const paAll = printPaReport('TÜM SİNYALLER', allPa);
  const paGuclu = printPaReport('GÜÇLÜ (4/4 confirmed)', allPa.filter((s) => s.strength === 'GUCLU'));
  printPaReport('ORTA (3/4 confirmed)', allPa.filter((s) => s.strength === 'ORTA'));

  console.log('\n\n############################################');
  console.log('#     MEAN-REVERSION (aşırı bölge dönüşü)   #');
  console.log('############################################');
  const mrAll = printMrReport('TÜM SİNYALLER', allMr);

  console.log('\n\n############################################');
  console.log('#         KARŞILAŞTIRMA (aynı 6 ay, aynı 200 sembol)  #');
  console.log('############################################');
  const rows: Array<{ label: string; total: number; winRate: number | null; avgR: number | null; avgDays: number | null }> = [
    { label: 'Price Action — Tüm sinyaller', ...paAll },
    { label: 'Price Action — GÜÇLÜ (4/4)', ...paGuclu },
    { label: 'Mean-Reversion — Tüm sinyaller', ...mrAll },
  ];
  const fmt = (v: number | null, suffix = '') => (v === null ? 'yetersiz veri' : `${v >= 0 && suffix === 'R' ? '+' : ''}${v.toFixed(suffix === '%' ? 1 : 2)}${suffix}`);
  const colWidth = Math.max(...rows.map((r) => r.label.length)) + 2;
  console.log(
    '\n' + 'Strateji'.padEnd(colWidth) + 'Sinyal'.padStart(8) + 'Win Rate'.padStart(12) + 'Ort. R'.padStart(10) + 'Ort. Gün'.padStart(10),
  );
  for (const r of rows) {
    console.log(
      r.label.padEnd(colWidth) +
      String(r.total).padStart(8) +
      fmt(r.winRate, '%').padStart(12) +
      fmt(r.avgR, 'R').padStart(10) +
      (r.avgDays !== null ? r.avgDays.toFixed(1) : '-').padStart(10),
    );
  }

  console.log('\nNot: İki strateji de AYNI taramada, AYNI top-200 sembol listesi ve AYNI çekilen');
  console.log('mum verisi üzerinde koşturuldu — sonuçlar birebir karşılaştırılabilir. Price action');
  console.log('R hesabı tam pozisyon/son-ulaşılan-TP-seviyesi varsayımıyla, mean-reversion R hesabı');
  console.log('tek hedef (giriş anında sabitlenmiş 20-EMA) varsayımıyla yapılmıştır. "Süre doldu"');
  console.log('sinyaller her iki stratejide de win-rate/ortalama R hesabına dahil edilmemiştir.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
