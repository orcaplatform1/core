import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

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
  strength: 'GUCLU' | 'ORTA' | 'RISKLI';
  stillValid: boolean;
  distancePercent: number;
  patternType: 'ICT_BREAKOUT_RETEST' | 'FX_LIQUIDITY_SWEEP';
}

const YAHOO_MAP: Record<string, string> = {
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X', USDCHF: 'USDCHF=X',
  AUDUSD: 'AUDUSD=X', USDCAD: 'USDCAD=X', NZDUSD: 'NZDUSD=X', EURGBP: 'EURGBP=X',
  EURJPY: 'EURJPY=X', GBPJPY: 'GBPJPY=X', EURCHF: 'EURCHF=X', AUDJPY: 'AUDJPY=X',
  CADJPY: 'CADJPY=X', XAUUSD: 'GC=F', XAGUSD: 'SI=F', BRENT: 'BZ=F', WTI: 'CL=F',
  USDCNH: 'USDCNH=X', USDZAR: 'USDZAR=X', USDMXN: 'USDMXN=X',
};

// USDT karsisinda anlamli bir supply/demand hareketi olusturmayan (fiyati zaten
// ~1.00 civarinda sabit kalan) stablecoin taban varliklari - tarama evreninden
// tamamen cikarilir (bkz. fetchTopBinanceSymbols). Buyumesi muhtemel bir liste,
// kolay guncellenebilmesi icin ayri bir config sabiti olarak tutulur.
const STABLECOIN_BASE_ASSETS = new Set([
  'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'USDP', 'PYUSD', 'USDD', 'GUSD',
]);

// --- ICT/SMC Breakout & Retest modeli (SADECE kripto Day-Trade taramasinda
// kullanilir, bkz. buildIctBreakoutRetestSetup/scanDayTrade). Eski Arz/Talep
// (Supply/Demand Zone) modeli - buildZoneSetup ve yardimcilari - swing'in
// tamamen kaldirilmasi ve forex day-trade'in de kendi ICT stratejisine
// gecmesiyle birlikte hicbir yerden cagrilmadigi icin silindi. ---
// MSB (Market Structure Break) icin geriye bakilan mum sayisi.
const ICT_MSB_LOOKBACK = 5;
// Kirilim mumunun hacmi, ortalama hacmin en az bu kati olmali.
const ICT_VOLUME_MULT = 1.5;
// Hacim ortalamasi bu kadar mum uzerinden (kirilim mumu haric) hesaplanir.
const ICT_VOLUME_LOOKBACK = 20;
// Trend filtresi icin EMA periyodu - fiyat bu EMA'nin ustunde olmali.
const ICT_EMA_TREND_PERIOD = 200;
const ICT_ATR_PERIOD = 14;
// Stop, FVG ucgenindeki en dusuk low'un ATR*bu kat kadar altina konur.
const ICT_ATR_STOP_MULT = 0.5;
// TP = Entry + (Entry-Stop) * bu kat (net 1:2 R:R).
const ICT_RR_MULT = 2;
// Taranacak en hacimli coin sayisi (eski modelde 200'du).
const ICT_TOP_SYMBOLS = 50;
// BTC piyasa filtresi icin EMA periyodu.
const ICT_BTC_EMA_PERIOD = 50;
// BTC'nin son 15dk mumu bu yuzdeden fazla dusmusse piyasa "guvensiz" sayilir.
const ICT_BTC_DROP_PCT = 1.5;
// EMA200 + hacim ortalamasi + MSB lookback icin gereken minimum mum sayisi.
const ICT_MIN_CANDLES = 210;

// --- Forex Day-Trade: ICT Likidite Suprurme (Liquidity Sweep) modeli, SADECE
// forex day-trade taramasinda kullanilir (bkz. buildForexLiquiditySweepSetup/
// scanForexDayTrade). 1S trend + 15dk likidite avi + FVG girisi. ---
// 1S MSS (Market Structure Shift) icin geriye bakilan mum sayisi - kullanici
// bu sayiyi vermedi, kripto'daki ICT_MSB_LOOKBACK ile tutarlilik icin ayni
// deger (5) kullaniliyor.
const FX_1H_MSS_LOOKBACK = 5;
// Stop, supurme mumunun en uc low'unun bu kadar pip altina konur.
const FX_STOP_PIP_BUFFER = 2;
// TP = Entry + Risk * bu kat (net 1:3 R:R).
const FX_RR_MULT = 3;
// Seans tanimlari (UTC saat, standart/yaygin kabul gorern siniglar - kesin
// degil, kullanici onayina acik).
const FX_SESSIONS: { name: string; startHourUtc: number; endHourUtc: number }[] = [
  { name: 'TOKYO', startHourUtc: 0, endHourUtc: 9 },
  { name: 'LONDON', startHourUtc: 8, endHourUtc: 17 },
  { name: 'NEW_YORK', startHourUtc: 13, endHourUtc: 22 },
];
// TSI 23:55-01:05 = UTC 20:55-22:05 (TSI = UTC+3) - banka gun sonu hesap
// devri, spread asiri acilir, bu pencerede uretilen sinyaller elenir.
const FX_SPREAD_BLOCK_START_UTC_MIN = 20 * 60 + 55;
const FX_SPREAD_BLOCK_END_UTC_MIN = 22 * 60 + 5;
// DXY korelasyon filtresinin uygulandigi majör pariteler (spec: "EURUSD veya
// GBPUSD gibi majör paritelerde").
const FX_DXY_FILTERED_SYMBOLS = new Set(['EURUSD', 'GBPUSD']);
const FX_DXY_YAHOO_SYMBOL = 'DX-Y.NYB';
const FX_DXY_EMA_PERIOD = 50;
// JPY iceren paritelerde pip = 0.01, digerlerinde (emtia/egzotikler dahil,
// spec'te ayrim yok) 0.0001.
function pipSize(symbol: string): number {
  return symbol.includes('JPY') ? 0.01 : 0.0001;
}
// Bilinen yuksek etkili haber (Faiz/CPI/NFP vb.) tarihleri - ILERIYE DONUK,
// canli bir takvim API'si YOK (kullanici onayiyla: "takvim gunleri zaten
// belli, o gunlerde islem arama, 1 gun sonra devam et"). Bu tarihte forex
// day-trade taramasi o GUN BOYUNCA tamamen atlanir. FOMC tarihleri
// economic-tools.service.ts'teki UPCOMING_FOMC_MEETINGS ile ayni (dogrulanmis,
// gercek tarihler). CPI/NFP gibi diger aylik veri tarihleri BURAYA ELLE
// EKLENMELI - ileri tarihler icin guvenilir/dogrulanmis bir kaynagim yoktu,
// uydurmadim. Yeni tarih eklemek icin: 'YYYY-MM-DD' formatinda bu diziye ekle.
const FOREX_BLOCKED_DATES: string[] = [
  '2026-09-16', // FOMC Toplantisi (Eylul 2026)
  '2026-10-28', // FOMC Toplantisi (Ekim 2026)
  '2026-12-09', // FOMC Toplantisi (Aralik 2026)
];

@Injectable()
export class ScannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async fetchTopBinanceSymbols(limit: number): Promise<string[]> {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!res.ok) return [];
      const data = await res.json();
      return data
        .filter((t: any) =>
          t.symbol.endsWith('USDT') &&
          !t.symbol.includes('UPUSDT') &&
          !t.symbol.includes('DOWNUSDT') &&
          !STABLECOIN_BASE_ASSETS.has(t.symbol.slice(0, -4)),
        )
        .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, limit)
        .map((t: any) => t.symbol);
    } catch {
      return [];
    }
  }

  // ICT/SMC Breakout & Retest modeli icin - interval=15m, limit=300, EMA200 +
  // hacim ortalamasi + MSB lookback icin yeterli gecmisi karsilar.
  private async fetchBinance15m(symbol: string, limit = 300): Promise<Candle[]> {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const closed = data.slice(0, -1);
    return closed.map((c: any) => ({
      time: c[0], open: parseFloat(c[1]), high: parseFloat(c[2]),
      low: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5]),
    }));
  }

  private async fetchBinanceFundingRate(symbol: string): Promise<number | null> {
    try {
      const url = `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return parseFloat(data.lastFundingRate) * 100;
    } catch {
      return null;
    }
  }

  private async fetchYahoo(yahooSymbol: string, range: string, interval: string): Promise<Candle[]> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${interval}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];
    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    return timestamps
      .map((t, i) => ({
        time: t * 1000, open: quote.open?.[i], high: quote.high?.[i],
        low: quote.low?.[i], close: quote.close?.[i], volume: quote.volume?.[i] ?? 0,
      }))
      .filter((c) => c.close != null);
  }

  private ema(values: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const result: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      result.push(values[i] * k + result[i - 1] * (1 - k));
    }
    return result;
  }

  private atr(candles: Candle[], period = 14): number {
    const trs: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      const prev = candles[i - 1];
      trs.push(Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)));
    }
    const recent = trs.slice(-period);
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }

  // BTC Piyasa Filtresi: BTC kendi 15dk EMA50'sinin altindaysa veya son 15dk
  // mumu %ICT_BTC_DROP_PCT'ten fazla dustuyse piyasa "guvensiz" sayilir - o
  // taramada hic ICT sinyali uretilmez (spec: "Tum altcoin sinyalleri iptal
  // edilir"). Veri cekilemezse de guvensiz varsayilir (fail-safe).
  private async isBtcMarketSafe(): Promise<boolean> {
    try {
      const btc = await this.fetchBinance15m('BTCUSDT', ICT_BTC_EMA_PERIOD + 20);
      if (btc.length < ICT_BTC_EMA_PERIOD + 1) return false;
      const closes = btc.map((c) => c.close);
      const ema50Series = this.ema(closes, ICT_BTC_EMA_PERIOD);
      const lastEma50 = ema50Series[ema50Series.length - 1];
      const last = btc[btc.length - 1];
      if (last.close < lastEma50) return false;
      const candleChangePct = ((last.close - last.open) / last.open) * 100;
      if (candleChangePct < -ICT_BTC_DROP_PCT) return false;
      return true;
    } catch {
      return false;
    }
  }

  // ICT/SMC Breakout & Retest modeli - SADECE kripto Day-Trade taramasinda
  // kullanilir (bkz. scanDayTrade). 15 dakikalik mumlar uzerinde calisir.
  //
  // candle[n-1] (son kapanan mum) = hem MSB/kirilim mumu hem de FVG ucgeninin
  // 3. (en yeni) mumu. candle[n-2] = FVG'nin 2. (itici/govdeli) mumu.
  // candle[n-3] = FVG'nin 1. (en eski) mumu. FVG sarti: candle[n-1].low >
  // candle[n-3].high. Giris = candle[n-1].low (FVG kutusunun ust siniri).
  private buildIctBreakoutRetestSetup(candles: Candle[]): Setup | null {
    if (candles.length < ICT_MIN_CANDLES) return null;

    const n = candles.length;
    const breakoutCandle = candles[n - 1];
    const fvgMiddleCandle = candles[n - 2];
    const fvgFirstCandle = candles[n - 3];

    // 1) Market Yapisi Kirilimi (MSB): son kapanan mum, onceki 5 mumun en
    // yuksek "high"ini yukari yonlu kirip UZERINDE kapanmis olmali.
    const priorHighs = candles.slice(n - 1 - ICT_MSB_LOOKBACK, n - 1).map((c) => c.high);
    if (priorHighs.length < ICT_MSB_LOOKBACK) return null;
    const priorMax = Math.max(...priorHighs);
    if (!(breakoutCandle.close > priorMax)) return null;

    // 2) Hacim Onayi: kirilim mumunun hacmi, son 20 mumun (kirilim mumu
    // haric) ortalamasinin en az 1.5 kati olmali.
    const volumeWindow = candles.slice(n - 1 - ICT_VOLUME_LOOKBACK, n - 1).map((c) => c.volume);
    if (volumeWindow.length < ICT_VOLUME_LOOKBACK) return null;
    const avgVolume = volumeWindow.reduce((a, b) => a + b, 0) / volumeWindow.length;
    if (!(avgVolume > 0) || !(breakoutCandle.volume >= avgVolume * ICT_VOLUME_MULT)) return null;

    // 3) Giris Bolgesi (FVG): kirilimi yapan 3 mumluk yapida, 1. mumun en
    // yuksek noktasi ile 3. (kirilim) mumun en dusuk noktasi arasinda bosluk
    // olmali.
    if (!(breakoutCandle.low > fvgFirstCandle.high)) return null;

    // 4) Trend Filtresi (EMA200): fiyat 15dk EMA200'un uzerinde olmali,
    // aksi halde buyuk trend dusus yonlu sayilir ve sinyal elenir.
    const closes = candles.map((c) => c.close);
    const ema200Series = this.ema(closes, ICT_EMA_TREND_PERIOD);
    const ema200 = ema200Series[ema200Series.length - 1];
    if (!(breakoutCandle.close > ema200)) return null;

    // 5) Matematiksel Kurulum
    const entryZoneTop = breakoutCandle.low; // FVG kutusunun ust siniri
    const entryZoneBottom = fvgFirstCandle.high; // FVG kutusunun alt siniri
    const entry = entryZoneTop; // Giris Seviyesi

    const atrValue = this.atr(candles, ICT_ATR_PERIOD);
    const swingLow = Math.min(breakoutCandle.low, fvgMiddleCandle.low, fvgFirstCandle.low);
    const stop = swingLow - atrValue * ICT_ATR_STOP_MULT;
    const risk = entry - stop;
    if (!(risk > 0)) return null;
    const tp = entry + risk * ICT_RR_MULT;

    const currentPrice = breakoutCandle.close;
    const stillValid = currentPrice <= entryZoneTop && currentPrice >= entryZoneBottom;
    const distancePercent = stillValid
      ? 0
      : Math.round((Math.abs(currentPrice - entry) / entry) * 10000) / 100;

    const reasons: string[] = [
      `Market Yapısı Kırılımı: son 15dk mum kapanışı, önceki ${ICT_MSB_LOOKBACK} mumun en yüksek seviyesini yukarı yönlü kırdı`,
      `Hacim Onayı: kırılım mumunun hacmi, son ${ICT_VOLUME_LOOKBACK} mum ortalamasının ${ICT_VOLUME_MULT}× katına ulaştı`,
      `Fair Value Gap: giriş bölgesi ${entryZoneBottom.toFixed(6)} - ${entryZoneTop.toFixed(6)}`,
      `Trend Filtresi: fiyat 15dk EMA${ICT_EMA_TREND_PERIOD} üzerinde`,
      `Risk/Ödül: net 1:${ICT_RR_MULT}`,
    ];

    return {
      direction: 'LONG',
      currentPrice,
      entry,
      entryZoneTop,
      entryZoneBottom,
      stop,
      tp1: tp,
      tp2: tp,
      tp3: tp,
      rr: ICT_RR_MULT,
      reasons,
      strength: 'GUCLU',
      stillValid,
      distancePercent,
      patternType: 'ICT_BREAKOUT_RETEST',
    };
  }


  private correlation(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    if (n < 2) return 0;
    const aSlice = a.slice(-n), bSlice = b.slice(-n);
    const avgA = aSlice.reduce((s, x) => s + x, 0) / n;
    const avgB = bSlice.reduce((s, x) => s + x, 0) / n;
    let num = 0, denA = 0, denB = 0;
    for (let i = 0; i < n; i++) {
      num += (aSlice[i] - avgA) * (bSlice[i] - avgB);
      denA += (aSlice[i] - avgA) ** 2;
      denB += (bSlice[i] - avgB) ** 2;
    }
    const den = Math.sqrt(denA * denB);
    return den === 0 ? 0 : num / den;
  }

  private async interpretWithAI(symbol: string, setup: any): Promise<string | null> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;

    const prompt = `Sen deneyimli bir teknik analiz uzmanısın. Aşağıdaki kural bazlı tarama sonucu için kısa, profesyonel bir senaryo yorumu yap. Yatırım tavsiyesi verme, sadece teknik durumu ve olası senaryoları özetle.

Enstrüman: ${symbol}
Yön: ${setup.direction}
Giriş Bölgesi: ${setup.entryZoneBottom} - ${setup.entryZoneTop}
Stop: ${setup.stop}
TP1: ${setup.tp1}, TP2: ${setup.tp2}, TP3: ${setup.tp3}
R:R: ${setup.rr}
Tarihsel başarı oranı: ${setup.winRatePercent ?? 'yetersiz veri'}%
Tespit edilen konfirmasyonlar: ${setup.reasons.join(', ')}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.content?.[0]?.text ?? null;
    } catch {
      return null;
    }
  }

  // ICT/SMC Breakout & Retest modeli - SADECE kripto Day-Trade (swing kripto
  // ve forex de dahil, tum swing mantigi tamamen kaldirildi). En hacimli
  // ICT_TOP_SYMBOLS coin, 15 dakikalik mumlar uzerinde taranir. Tarama basina
  // BIR kez BTC piyasa filtresi kontrol edilir - guvensizse hic aday uretilmez.
  async scanDayTrade() {
    const marketSafe = await this.isBtcMarketSafe();
    if (!marketSafe) {
      console.log('[scanDayTrade] BTC piyasa filtresi tetiklendi (EMA50 altinda veya son mum %1.5+ dustu), tarama atlandi');
      return [];
    }

    const symbolList = await this.fetchTopBinanceSymbols(ICT_TOP_SYMBOLS);

    const candidates: any[] = [];
    const returnsMap: Record<string, number[]> = {};

    for (const symbol of symbolList) {
      try {
        const candles = await this.fetchBinance15m(symbol, 300);
        if (candles.length < ICT_MIN_CANDLES) continue;

        const setup = this.buildIctBreakoutRetestSetup(candles);
        if (!setup) continue;

        const closes = candles.slice(-60).map((c) => c.close);
        returnsMap[symbol] = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);

        candidates.push({ symbol, ...setup, winRatePercent: null, fundingRate: null, style: 'DAY' });
      } catch { continue; }
      await new Promise((r) => setTimeout(r, 150));
    }

    const selected: any[] = [];
    for (const c of candidates) {
      const tooCorrelated = selected.some((s) => this.correlation(returnsMap[s.symbol] ?? [], returnsMap[c.symbol] ?? []) > 0.8);
      if (!tooCorrelated) selected.push(c);
    }

    console.log(
      `[scanDayTrade] ICT_BREAKOUT_RETEST: taranan=${symbolList.length} bulunanAday=${candidates.length} ` +
      `korelasyonSonrasi(selected)=${selected.length}`,
    );

    for (const s of selected) {
      s.aiCommentary = await this.interpretWithAI(s.symbol, s);
    }

    return selected;
  }

  // Su anki UTC saatine gore hangi seansta oldugumuzu bulur, bir onceki
  // seansin (gerekirse bir onceki takvim gunune duşen) 15dk mumlari icindeki
  // en dusuk low degerini dondurur. Yeterli veri yoksa null.
  private findPreviousSessionLow(fifteenMin: Candle[]): number | null {
    const now = new Date();
    const nowHourUtc = now.getUTCHours();
    const currentIndex = FX_SESSIONS.findIndex(
      (s) => nowHourUtc >= s.startHourUtc && nowHourUtc < s.endHourUtc,
    );
    const prevIndex = currentIndex >= 0
      ? (currentIndex - 1 + FX_SESSIONS.length) % FX_SESSIONS.length
      : FX_SESSIONS.length - 1;
    const prevSession = FX_SESSIONS[prevIndex];

    let sessionStart = new Date(now);
    sessionStart.setUTCHours(prevSession.startHourUtc, 0, 0, 0);
    let sessionEnd = new Date(now);
    sessionEnd.setUTCHours(prevSession.endHourUtc, 0, 0, 0);
    // Bugunku oncurrence henuz gerceklesmediyse (bitis su andan ileride ise),
    // gercek "onceki" seans dunku oncurrence'dir.
    if (sessionEnd.getTime() > now.getTime()) {
      sessionStart = new Date(sessionStart.getTime() - 24 * 60 * 60 * 1000);
      sessionEnd = new Date(sessionEnd.getTime() - 24 * 60 * 60 * 1000);
    }

    const inSession = fifteenMin.filter((c) => c.time >= sessionStart.getTime() && c.time < sessionEnd.getTime());
    if (inSession.length === 0) return null;
    return Math.min(...inSession.map((c) => c.low));
  }

  // Forex Day-Trade: ICT Likidite Supurme (Liquidity Sweep) modeli. Kripto'daki
  // duz devam/kirilim yapisindan farkli olarak burada bir GERI CEKILME +
  // LIKIDITE AVI + TERSINE DONUS yapisi araniyor:
  //  1) 1S MSS: 1 saatlik seride son kapanan mum, onceki FX_1H_MSS_LOOKBACK
  //     mumun en yuksegini kirip uzerinde kapanmis olmali (ana yon LONG).
  //  2) 15dk Likidite Supurme: bir onceki seansin en dusuk seviyesinin altina
  //     bir 15dk mumun FITILI sarkmali (kapanisin altinda olmasina gerek yok).
  //  3) Tersine Donus + FVG: supurmeden SONRA gelen 3 mumluk yapida (kripto ile
  //     ayni yorum: candle[n-3]->candle[n-2]->candle[n-1], candle[n-1] hem
  //     tersine donus hem FVG'nin 3. mumu) FVG olusmali: candle[n-1].low >
  //     candle[n-3].high.
  // Entry = FVG kutusunun %50 orta noktasi (kripto'dan farkli - kripto'da ust
  // siniriydi). Stop = supurme mumunun en uc low'u - FX_STOP_PIP_BUFFER pip.
  // TP = Entry + Risk * FX_RR_MULT (net 1:3).
  private buildForexLiquiditySweepSetup(symbol: string, hourly: Candle[], fifteenMin: Candle[]): Setup | null {
    if (hourly.length < FX_1H_MSS_LOOKBACK + 1 || fifteenMin.length < 30) return null;

    // 1) 1S MSS - ana yon LONG mu?
    const hN = hourly.length;
    const breakout1h = hourly[hN - 1];
    const prior1hHighs = hourly.slice(hN - 1 - FX_1H_MSS_LOOKBACK, hN - 1).map((c) => c.high);
    if (prior1hHighs.length < FX_1H_MSS_LOOKBACK) return null;
    if (!(breakout1h.close > Math.max(...prior1hHighs))) return null;

    // 2) Onceki seansin en dusuk seviyesi + likidite supurme (fitil bazli,
    // supurmeden sonraki FVG ucgeninden ONCE olmali).
    const prevSessionLow = this.findPreviousSessionLow(fifteenMin);
    if (prevSessionLow === null) return null;

    const n = fifteenMin.length;
    let sweepLow: number | null = null;
    for (let i = n - 4; i >= Math.max(0, n - 40); i--) {
      if (fifteenMin[i].low < prevSessionLow) {
        sweepLow = fifteenMin[i].low;
        break;
      }
    }
    if (sweepLow === null) return null;

    // 3) Tersine donus + FVG (kripto ile ayni yorum)
    const c3 = fifteenMin[n - 1];
    const c1 = fifteenMin[n - 3];
    if (!(c3.low > c1.high)) return null;

    // Matematiksel Kurulum
    const entryZoneBottom = c1.high;
    const entryZoneTop = c3.low;
    const entry = (entryZoneTop + entryZoneBottom) / 2; // FVG kutusunun %50 orta noktasi

    const pip = pipSize(symbol);
    const stop = sweepLow - FX_STOP_PIP_BUFFER * pip;
    const risk = entry - stop;
    if (!(risk > 0)) return null;
    const tp = entry + risk * FX_RR_MULT;

    const currentPrice = c3.close;
    const stillValid = currentPrice <= entryZoneTop && currentPrice >= entryZoneBottom;
    const distancePercent = stillValid
      ? 0
      : Math.round((Math.abs(currentPrice - entry) / entry) * 10000) / 100;

    const reasons: string[] = [
      `1S Trend (MSS): son 1 saatlik mum kapanışı, önceki ${FX_1H_MSS_LOOKBACK} mumun en yüksek seviyesini yukarı yönlü kırdı`,
      `Likidite Süpürme: fiyat önceki seansın en düşük seviyesinin (${prevSessionLow.toFixed(5)}) altına sarktı`,
      `Fair Value Gap: giriş bölgesi ${entryZoneBottom.toFixed(5)} - ${entryZoneTop.toFixed(5)} (%50 orta nokta: ${entry.toFixed(5)})`,
      `Risk/Ödül: net 1:${FX_RR_MULT}`,
    ];

    return {
      direction: 'LONG',
      currentPrice,
      entry,
      entryZoneTop,
      entryZoneBottom,
      stop,
      tp1: tp,
      tp2: tp,
      tp3: tp,
      rr: FX_RR_MULT,
      reasons,
      strength: 'GUCLU',
      stillValid,
      distancePercent,
      patternType: 'FX_LIQUIDITY_SWEEP',
    };
  }

  // Forex Day Trade: ICT Likidite Supurme modeli. Guvenlik filtreleri (spec
  // sirasiyla): 1) bilinen yuksek etkili haber gunu ise tarama tamamen
  // atlanir, 2) TSI 23:55-01:05 (banka gun sonu spread genislemesi) ise
  // atlanir, 3) DXY kendi 15dk EMA50'sinin ustundeyse (dolar guclu/yukselen)
  // EURUSD/GBPUSD icin LONG aranmaz.
  async scanForexDayTrade() {
    const todayIso = new Date().toISOString().slice(0, 10);
    if (FOREX_BLOCKED_DATES.includes(todayIso)) {
      console.log(`[scanForexDayTrade] ${todayIso} yuksek etkili haber gunu (FOREX_BLOCKED_DATES), tarama atlandi`);
      return [];
    }

    const nowUtcMin = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
    if (nowUtcMin >= FX_SPREAD_BLOCK_START_UTC_MIN && nowUtcMin < FX_SPREAD_BLOCK_END_UTC_MIN) {
      console.log('[scanForexDayTrade] Spread/zaman filtresi tetiklendi (TSİ 23:55-01:05), tarama atlandı');
      return [];
    }

    let dxyBelowEma50: boolean | null = null;
    try {
      const dxyCandles = await this.fetchYahoo(FX_DXY_YAHOO_SYMBOL, '5d', '15m');
      if (dxyCandles.length >= FX_DXY_EMA_PERIOD + 1) {
        const dxyCloses = dxyCandles.map((c) => c.close);
        const dxyEma50 = this.ema(dxyCloses, FX_DXY_EMA_PERIOD);
        dxyBelowEma50 = dxyCandles[dxyCandles.length - 1].close < dxyEma50[dxyEma50.length - 1];
      }
    } catch { /* dxyBelowEma50 null kalir - veri yoksa DXY filtresi uygulanmaz */ }

    const symbols = Object.keys(YAHOO_MAP);
    const candidates: any[] = [];
    const returnsMap: Record<string, number[]> = {};

    for (const symbol of symbols) {
      // DXY Korelasyon Filtresi: sadece EURUSD/GBPUSD icin - DXY kendi
      // EMA50'sinin ALTINDA degilse (dolar zayif degilse) bu paritede LONG aranmaz.
      if (FX_DXY_FILTERED_SYMBOLS.has(symbol) && dxyBelowEma50 === false) continue;

      const yahooSymbol = YAHOO_MAP[symbol];
      try {
        const hourly = await this.fetchYahoo(yahooSymbol, '1mo', '1h');
        const fifteenMin = await this.fetchYahoo(yahooSymbol, '5d', '15m');
        if (hourly.length < FX_1H_MSS_LOOKBACK + 1 || fifteenMin.length < 30) continue;

        const setup = this.buildForexLiquiditySweepSetup(symbol, hourly, fifteenMin);
        if (!setup) continue;

        const closes = fifteenMin.slice(-60).map((c) => c.close);
        returnsMap[symbol] = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);

        candidates.push({ symbol, ...setup, winRatePercent: null, fundingRate: null, style: 'DAY' });
      } catch { continue; }
      await new Promise((r) => setTimeout(r, 150));
    }

    const selected: any[] = [];
    for (const c of candidates) {
      const tooCorrelated = selected.some((s) => this.correlation(returnsMap[s.symbol] ?? [], returnsMap[c.symbol] ?? []) > 0.8);
      if (!tooCorrelated) selected.push(c);
      if (selected.length === 25) break;
    }

    console.log(
      `[scanForexDayTrade] FX_LIQUIDITY_SWEEP: taranan=${symbols.length} bulunanAday=${candidates.length} ` +
      `korelasyonSonrasi(selected)=${selected.length}`,
    );

    for (const s of selected) {
      s.aiCommentary = await this.interpretWithAI(s.symbol, s);
    }

    return selected;
  }

  async getLivePrice(symbol: string, market: string = 'CRYPTO'): Promise<{ symbol: string; price: number | null }> {
    if (market === 'FOREX') return this.getLiveForexPrice(symbol);
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      if (!res.ok) return { symbol, price: null };
      const data = await res.json();
      return { symbol, price: parseFloat(data.price) };
    } catch {
      return { symbol, price: null };
    }
  }

  // Yahoo Finance'in Binance'inki gibi hafif bir "guncel fiyat" ticker endpoint'i
  // yok - en son 1 dakikalik mumun kapanisi canli fiyat yerine kullanilir.
  async getLiveForexPrice(symbol: string): Promise<{ symbol: string; price: number | null }> {
    const yahooSymbol = YAHOO_MAP[symbol];
    if (!yahooSymbol) return { symbol, price: null };
    try {
      const candles = await this.fetchYahoo(yahooSymbol, '1d', '1m');
      if (candles.length === 0) return { symbol, price: null };
      return { symbol, price: candles[candles.length - 1].close };
    } catch {
      return { symbol, price: null };
    }
  }

  async runDayTradeScan() {
    const crypto = await this.scanDayTrade();
    const results = { crypto, scannedAt: new Date() };
    await this.prisma.scanResult.create({
      data: { results: results as any, style: 'DAY', market: 'CRYPTO', strategyName: 'ICT_BREAKOUT_RETEST' },
    });
    return results;
  }

  async runForexDayTradeScan() {
    const crypto = await this.scanForexDayTrade();
    const results = { crypto, scannedAt: new Date() };
    await this.prisma.scanResult.create({
      data: { results: results as any, style: 'DAY', market: 'FOREX', strategyName: 'FX_LIQUIDITY_SWEEP' },
    });
    return results;
  }

  async getLastScan(style: string = 'DAY', market: string = 'CRYPTO') {
    return this.prisma.scanResult.findFirst({ where: { style, market: market as any }, orderBy: { createdAt: 'desc' } });
  }

  async scheduledDayTradeScan() {
    const previousScan = await this.prisma.scanResult.findFirst({
      where: { style: 'DAY', market: 'CRYPTO' },
      orderBy: { createdAt: 'desc' },
    });
    const previousActiveSymbols = new Set(
      ((previousScan?.results as any)?.crypto ?? [])
        .filter((c: any) => c.stillValid)
        .map((c: any) => c.symbol),
    );

    const results = await this.runDayTradeScan();
    const activeSignals = results.crypto.filter((c: any) => c.stillValid);

    const openTracked = await this.prisma.trackedSignal.findMany({
      where: { style: 'DAY', market: 'CRYPTO', status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      select: { symbol: true },
    });
    const trackedSymbols = new Set(openTracked.map((t) => t.symbol));
    const newActiveSignals = activeSignals.filter(
      (c: any) => !previousActiveSymbols.has(c.symbol) && !trackedSymbols.has(c.symbol),
    );
    const signalsNeedingTracking = activeSignals.filter((c: any) => !trackedSymbols.has(c.symbol));
    if (signalsNeedingTracking.length > 0) {
      await this.createTrackedSignals(signalsNeedingTracking, 'DAY', 'CRYPTO');
    }
    // Swing tamamen kaldirildigi icin acik sinyallerin (kripto+forex, hepsi
    // artik DAY) WATCHING->TRIGGERED->HIT_TP/HIT_STOP guncellemesi buradan
    // yapiliyor - bu, 15 dakikada bir calisan tikimlerden biri.
    await this.updateTrackedSignals();

    if (newActiveSignals.length === 0) return;

    const admins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    });

    const symbolList = newActiveSignals.map((c: any) => `${c.symbol} (${c.direction})`).join(', ');
    const message = `${newActiveSignals.length} yeni aktif Day Trade sinyali: ${symbolList}`;

    await this.notificationsService.createForManyUsers(
      admins.map((a) => a.id),
      {
        type: 'SYSTEM',
        title: 'AI Tarayıcı: Yeni Day Trade Sinyali',
        message,
      },
    );
  }

  async scheduledForexDayTradeScan() {
    const previousScan = await this.prisma.scanResult.findFirst({
      where: { style: 'DAY', market: 'FOREX' },
      orderBy: { createdAt: 'desc' },
    });
    const previousActiveSymbols = new Set(
      ((previousScan?.results as any)?.crypto ?? [])
        .filter((c: any) => c.stillValid)
        .map((c: any) => c.symbol),
    );

    const results = await this.runForexDayTradeScan();
    const activeSignals = results.crypto.filter((c: any) => c.stillValid);

    const openTracked = await this.prisma.trackedSignal.findMany({
      where: { style: 'DAY', market: 'FOREX', status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      select: { symbol: true },
    });
    const trackedSymbols = new Set(openTracked.map((t) => t.symbol));
    const newActiveSignals = activeSignals.filter(
      (c: any) => !previousActiveSymbols.has(c.symbol) && !trackedSymbols.has(c.symbol),
    );
    const signalsNeedingTracking = activeSignals.filter((c: any) => !trackedSymbols.has(c.symbol));
    if (signalsNeedingTracking.length > 0) {
      await this.createTrackedSignals(signalsNeedingTracking, 'DAY', 'FOREX');
    }
    // NOT: updateTrackedSignals() burada CAGIRILMIYOR - scheduledDayTradeScan
    // (kripto day-trade) zaten TUM acik kayitlari (market farketmeksizin) her
    // 15 dakikada guncelliyor

    if (newActiveSignals.length === 0) return;

    const admins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    });

    const symbolList = newActiveSignals.map((c: any) => `${c.symbol} (${c.direction})`).join(', ');
    const message = `${newActiveSignals.length} yeni aktif Forex Day Trade sinyali: ${symbolList}`;

    await this.notificationsService.createForManyUsers(
      admins.map((a) => a.id),
      {
        type: 'SYSTEM',
        title: 'AI Tarayıcı: Yeni Forex Day Trade Sinyali',
        message,
      },
    );
  }
  async createTrackedSignals(newActiveSignals: any[], style: string = 'DAY', market: string = 'CRYPTO') {
    for (const s of newActiveSignals) {
      await this.prisma.trackedSignal.create({
        data: {
          symbol: s.symbol,
          direction: s.direction,
          entryZoneTop: s.entryZoneTop,
          entryZoneBottom: s.entryZoneBottom,
          stop: s.stop,
          tp1: s.tp1,
          tp2: s.tp2,
          tp3: s.tp3,
          rr: s.rr,
          strength: s.strength,
          style,
          market: market as any,
          status: 'WATCHING',
          strategyName: s.patternType ?? 'SUPPLY_DEMAND_ZONE',
        },
      });
    }
  }

  async updateTrackedSignals() {
    const openSignals = await this.prisma.trackedSignal.findMany({
      where: { status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
    });

    for (const sig of openSignals) {
      const bullish = sig.direction === 'LONG';
      const live = await this.getLivePrice(sig.symbol, sig.market);
      if (live.price === null) continue;
      const price = live.price;

      if (sig.status === 'WATCHING') {
        // Giris hic tetiklenmeden fiyat herhangi bir TP seviyesini gecmisse (ETCUSDT'de
        // gozlenen durum), bu setup artik gerceklestirilemez - normal mesafe/sure
        // esiklerini beklemeden hemen iptal edilir
        const passedAnyTp = bullish
          ? price >= Math.min(sig.tp1, sig.tp2, sig.tp3)
          : price <= Math.max(sig.tp1, sig.tp2, sig.tp3);
        if (passedAnyTp) {
          await this.prisma.trackedSignal.update({
            where: { id: sig.id },
            data: { status: 'INVALIDATED', closedAt: new Date() },
          });
          continue;
        }

        const entered = price <= sig.entryZoneTop && price >= sig.entryZoneBottom;
        if (entered) {
          await this.prisma.trackedSignal.update({
            where: { id: sig.id },
            data: { status: 'TRIGGERED', triggeredAt: new Date() },
          });
          continue;
        }
        const zoneMid = (sig.entryZoneTop + sig.entryZoneBottom) / 2;
        const distancePercent = Math.abs(price - zoneMid) / zoneMid * 100;
        const watchingAgeMs = Date.now() - sig.createdAt.getTime();
        const watchingExpiryMs = 3 * 24 * 60 * 60 * 1000;
        if (distancePercent > 8 || watchingAgeMs > watchingExpiryMs) {
          await this.prisma.trackedSignal.update({
            where: { id: sig.id },
            data: { status: 'INVALIDATED', closedAt: new Date() },
          });
        }
        continue;
      }

      // Tetiklenmis ama henuz stop/TP'ye ulasmamis, stile gore sure asimi:
      // SWING 10 gun, DAY 1 gun (day trade pozisyonlari uzun sure acik kalmamali)
      if (sig.triggeredAt) {
        const triggeredAgeMs = Date.now() - sig.triggeredAt.getTime();
        const expiryMs = sig.style === 'DAY' ? 1 * 24 * 60 * 60 * 1000 : 10 * 24 * 60 * 60 * 1000;
        if (triggeredAgeMs > expiryMs) {
          await this.prisma.trackedSignal.update({
            where: { id: sig.id },
            data: { status: 'EXPIRED', closedAt: new Date() },
          });
          continue;
        }
      }

      const hitStop = bullish ? price <= sig.stop : price >= sig.stop;
      if (hitStop) {
        // TP1 alindiktan sonra stop basabasa cekilmis oluyor (asagida) - fiyat
        // oraya donerse bu gercek bir kayip DEGIL, en son ulasilan TP'de kapanir
        const alreadyBankedTp = sig.status === 'HIT_TP1' || sig.status === 'HIT_TP2';
        await this.prisma.trackedSignal.update({
          where: { id: sig.id },
          data: alreadyBankedTp
            ? { closedAt: new Date() }
            : { status: 'HIT_STOP', closedAt: new Date() },
        });
        continue;
      }

      const hitTp3 = bullish ? price >= sig.tp3 : price <= sig.tp3;
      const hitTp2 = bullish ? price >= sig.tp2 : price <= sig.tp2;
      const hitTp1 = bullish ? price >= sig.tp1 : price <= sig.tp1;

      if (hitTp3) {
        await this.prisma.trackedSignal.update({
          where: { id: sig.id },
          data: { status: 'HIT_TP3', closedAt: new Date() },
        });
      } else if (hitTp2 && sig.status !== 'HIT_TP2') {
        await this.prisma.trackedSignal.update({
          where: { id: sig.id },
          data: { status: 'HIT_TP2' },
        });
      } else if (hitTp1 && sig.status === 'TRIGGERED') {
        // TP1 vuruldu: stop'u basabasa (giris bolgesi ortalamasina) cek -
        // artik bu islemde kayip riski yok, en kotu ihtimalle basabas kapanir
        const breakeven = (sig.entryZoneTop + sig.entryZoneBottom) / 2;
        await this.prisma.trackedSignal.update({
          where: { id: sig.id },
          data: { status: 'HIT_TP1', stop: breakeven },
        });
      }
    }
  }

  private async computeSignalStats(style: string, market: string) {
    const baseWhere: any = { style, market: market as any };

    const [activeCount, wins, losses] = await Promise.all([
      this.prisma.trackedSignal.count({
        where: { ...baseWhere, closedAt: null, status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      }),
      // Kazandi: kapanmis VE en az TP1'e ulasmis (TP1/TP2/TP3 hepsi gercek kar,
      // TP1 sonrasi stop basabasa cekildigi icin bu asamadan sonra kayip riski yok)
      this.prisma.trackedSignal.count({
        where: { ...baseWhere, closedAt: { not: null }, status: { in: ['HIT_TP1', 'HIT_TP2', 'HIT_TP3'] } },
      }),
      this.prisma.trackedSignal.count({ where: { ...baseWhere, status: 'HIT_STOP' } }),
    ]);
    const total = activeCount + wins + losses;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
    return { total, wins, losses, winRate };
  }

  async getTrackedSignals(style: string = 'DAY', market: string = 'CRYPTO') {
    const signals = await this.prisma.trackedSignal.findMany({
      where: { style, market: market as any },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const stats = await this.computeSignalStats(style, market);
    return { signals, stats };
  }


  // Kripto stratejisi (Supply/Demand -> ICT/SMC Breakout & Retest) tamamen
  // degistirildiginde eski kripto sinyallerini/tarama snapshotlarini bir kez
  // temizlemek icin. FOREX'e (market: 'FOREX') hicbir kosulda dokunmaz.
  async clearCryptoSignals() {
    const deletedTracked = await this.prisma.trackedSignal.deleteMany({
      where: { market: 'CRYPTO' },
    });
    const deletedScanResults = await this.prisma.scanResult.deleteMany({
      where: { market: 'CRYPTO' },
    });
    return {
      deletedTrackedSignals: deletedTracked.count,
      deletedScanResults: deletedScanResults.count,
    };
  }

  async cleanupTrackedSignals() {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const deletedWatchingSwing = await this.prisma.trackedSignal.deleteMany({
      where: { style: 'SWING', status: 'WATCHING', createdAt: { lt: threeDaysAgo } },
    });
    const deletedWatchingDay = await this.prisma.trackedSignal.deleteMany({
      where: { style: 'DAY', status: 'WATCHING', createdAt: { lt: eightHoursAgo } },
    });
    const deletedExpired = await this.prisma.trackedSignal.deleteMany({
      where: { status: 'EXPIRED', closedAt: { lt: threeDaysAgo } },
    });
    return {
      deletedWatching: deletedWatchingSwing.count + deletedWatchingDay.count,
      deletedExpired: deletedExpired.count,
    };
  }
}
