import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AutoTradeService } from '../execution/auto-trade.service';

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
// ~1.00 civarinda sabit kalan) stablecoin taban varliklari VE Binance'in
// dogrudan listeledigi fiat doviz ciftleri (ornegin EURUSDT - bu bir kripto
// yapisi degil, EUR/USD fiat kurunun neredeyse birebir yansimasi, ICT/SMC
// kirilim stratejisi icin anlamsiz sahte sinyaller uretiyordu) - tarama
// evreninden tamamen cikarilir (bkz. fetchTopBinanceSymbols). Buyumesi
// muhtemel bir liste, kolay guncellenebilmesi icin ayri bir config sabiti
// olarak tutulur.
const NON_CRYPTO_BASE_ASSETS = new Set([
  'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'USDP', 'PYUSD', 'USDD', 'GUSD',
  'EUR',
]);

// Adaylar arasi son 60 mumun getiri korelasyonu bu esigi asarsa (ayni
// sektor/benzer beta hareket eden varlik), ikinci sembol elenir. Kripto ve
// forex taramalarinda ortak kullanilir. 0.8 -> 0.88 (2026-08-09 revizyonu):
// asiri katiydi, benzer hareket eden ama farkli sinyal kalitesine sahip
// varliklari gereksiz yere siliyordu - esik yukseltilerek daha az agresif
// eleme yapiliyor.
const CORRELATION_THRESHOLD = 0.88;

// Bir sembolun TrackedSignal'i kapandiktan (HIT_TP3/HIT_STOP/EXPIRED/
// INVALIDATED - hepsi closedAt dolduruyor) sonra ayni sembol icin yeni bir
// sinyal acilmadan once beklenmesi gereken sure. Olmadan: fiyat ayni yapisal
// seviyede cirpinirsa (whipsaw) tarayici birkac tarama dongusu icinde ayni
// kirilimi "yeni sinyal" sanip tekrar tekrar aciyordu (kullanici sikayeti:
// "abc coin 3 kere ayni setup tetiklenmis"). Day-trade sinyallerinin kendi
// vadesiyle (triggeredAt sonrasi 1 gun) tutarli olmasi icin 24 saat secildi.
const SIGNAL_REENTRY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// --- ICT/SMC Breakout & Retest modeli (SADECE kripto Day-Trade taramasinda
// kullanilir, bkz. buildIctBreakoutRetestSetup/scanDayTrade). Eski Arz/Talep
// (Supply/Demand Zone) modeli - buildZoneSetup ve yardimcilari - swing'in
// tamamen kaldirilmasi ve forex day-trade'in de kendi ICT stratejisine
// gecmesiyle birlikte hicbir yerden cagrilmadigi icin silindi. ---
// MSB (Market Structure Break) icin geriye bakilan mum sayisi.
const ICT_MSB_LOOKBACK = 5;
// Kirilim mumunun hacmi, ortalama hacmin en az bu kati olmali. 1.5 -> 1.2
// (2026-08-09 revizyonu): %150 sarti canli piyasada neredeyse hic
// karsilanmiyordu (over-filtering), esik gevsetildi.
const ICT_VOLUME_MULT = 1.2;
// Hacim ortalamasi bu kadar mum uzerinden (kirilim mumu haric) hesaplanir.
const ICT_VOLUME_LOOKBACK = 20;
// Trend filtresi icin EMA periyodu - fiyat bu EMA'nin ustunde olmali.
const ICT_EMA_TREND_PERIOD = 200;
const ICT_ATR_PERIOD = 14;
// Stop, FVG ucgenindeki en dusuk low'un ATR*bu kat kadar altina konur.
const ICT_ATR_STOP_MULT = 0.5;
// TP3 (final hedef) = Entry + (Entry-Stop) * bu kat (net 1:2 R:R). TP1/TP2 bu
// hedefe kademeli ilerler (bkz. ICT_TP1_RR_MULT/ICT_TP2_RR_MULT) - eskiden
// ucu de ayni degere esitti (tek hedef), 2026-08-10'da 60 gunluk backtest
// (490 islem) matematiksel sabit R:R hedefinin (%40.1 win rate, +0.204R/islem)
// "onceki 200 mumun tepesi" gibi yapisal bir hedeften (%34.1 win rate,
// +0.054R/islem) daha iyi performans gosterdigini kanitladigi icin kademeleme
// de matematiksel R katlarina dayandirildi.
const ICT_RR_MULT = 2;
// TP1: pozisyonun bir kismi burada kapatilir / stop basabasa cekilir.
const ICT_TP1_RR_MULT = 1;
// TP2: ara hedef.
const ICT_TP2_RR_MULT = 1.5;
// Risk (entry-stop) duz % olarak sinirlanir. R, swingLow-entry farkina
// (o anki mumun wick yapisina) bagli oldugundan sinirsiz kucuk/buyuk
// cikabiliyordu (kullanici gozlemi 2026-08-17: TP1 kimi zaman %0.48 gibi
// asiri dar - spread/fee R'yi pratikte yiyor -, kimi zaman %6+ gibi asiri
// genis - tek 15dk mumdan gercekci olmayan bir TP3 mesafesi - cikiyordu).
// Bu araligin disindaki sinyaller uretilmeden elenir.
const ICT_MIN_RISK_PCT = 0.006; // %0.6
const ICT_MAX_RISK_PCT = 0.035; // %3.5
// Taranacak en hacimli coin sayisi. 50 -> 75 (2026-08-09 revizyonu): daha
// genis bir evrende sinyal bulma sansini artirmak icin havuz buyutuldu.
const ICT_TOP_SYMBOLS = 75;
// BTC'nin son 15dk mumu bu yuzdeden fazla dusmusse piyasa "guvensiz" sayilir
// (ani cokus / Black Swan filtresi). 2026-08-09 revizyonu: BTC'nin kendi
// EMA50'sinin altinda olmasi sartini kaldirir - o sart neredeyse her zaman
// tetiklenip taramayi tamamen iptal ediyordu (over-filtering), sadece ani
// cokus filtresi kaldi.
const ICT_BTC_DROP_PCT = 1.5;
// BTC kendi 1 saatlik EMA'sinin altindaysa (dusus trendi) hic LONG sinyali
// uretilmez. 2026-08-10: 60 gunluk backtest (479 islem, kripto) BTC bu trend
// altindayken tetiklenen sinyallerin de POZITIF (+0.09R/islem) ama BTC
// trendin ustundeyken (+0.30R/islem, %43.3 win rate vs %36.2) cok daha zayif
// kaldigini gosterdi - kalite/miktar tercihi geregi bu segment tamamen
// eleniyor.
const ICT_BTC_TREND_EMA_PERIOD = 50;
// EMA200 + hacim ortalamasi + MSB lookback icin gereken minimum mum sayisi.
const ICT_MIN_CANDLES = 210;

// --- Forex Day-Trade: ICT Likidite Suprurme (Liquidity Sweep) modeli, SADECE
// forex day-trade taramasinda kullanilir (bkz. buildForexLiquiditySweepSetup/
// scanForexDayTrade). 15dk likidite avi + 15dk MSB + FVG girisi. ---
// MSB (Market Structure Break) icin geriye bakilan mum sayisi. 2026-08-09
// revizyonu: onceden 1 saatlik grafik uzerinde ayri bir "1S MSS" sarti vardi
// (bkz. eski FX_1H_MSS_LOOKBACK) - bu, 15dk'lik likidite supurme/FVG
// mantigiyla zaman dilimi celiskisi yaratiyor ve over-filtering'e yol
// aciyordu. Artik MSB kontrolu de kriptodaki gibi dogrudan 15dk grafik
// uzerinde, supurmeden sonraki kirilim mumuyla yapiliyor; 1S veri cekme
// ihtiyaci tamamen kaldirildi.
const FX_MSS_LOOKBACK = 5;
// Stop, supurme mumunun en uc low'unun bu kadar pip altina konur.
const FX_STOP_PIP_BUFFER = 2;
// TP3 (final hedef) = Entry + Risk * bu kat (net 1:3 R:R). TP1/TP2 bu hedefe
// esit araliklarla kademelenir (bkz. FX_TP1_RR_MULT/FX_TP2_RR_MULT) - kripto
// tarafinda 2026-08-10'da backtest edilen matematiksel R:R kademelemesiyle
// tutarlilik icin ayni yontem (sabit R katlari) kullanildi.
const FX_RR_MULT = 3;
const FX_TP1_RR_MULT = 1;
const FX_TP2_RR_MULT = 2;
// Kripto tarafiyla ayni gerekce (bkz. ICT_MIN_RISK_PCT/ICT_MAX_RISK_PCT
// yorumu) - forex majorlerinde 15dk'lik hareketler kripto kadar genis
// olmadigi icin aralik daha dar tutuldu.
const FX_MIN_RISK_PCT = 0.0015; // %0.15
const FX_MAX_RISK_PCT = 0.012; // %1.2

// --- Simulasyon bakiyesi: gercek para olmadan "canli girsem ne olurdu"
// hissi vermek icin her tetiklenen sinyal, sifirdan bu sabit bakiye/kaldiracla
// acilmis GIBI varsayilir (kullanici geri bildirimi 2026-08-14). Compounding
// YOK - her islem birbirinden bagimsiz, kendi basina bu bakiyeyle acilir;
// aksi halde bir kayip sonraki tum islemlerin boyutunu kucultup gercekci
// olmayan bir egri uretirdi. Notional = bakiye x kaldirac; 1R'nin dolar
// karsiligi = notional x (risk mesafesi / giris fiyati) - yani riski genis
// olan (yuzdece) sinyallerde 1R daha fazla dolar ifade eder, tipki gercek
// pozisyon boyutlandirmasinda oldugu gibi. Kripto icin şu an acik/kapanmis
// sinyal yok ama sistem ayni formulle hazir, ilk sinyal geldiginde otomatik
// calisir.
const FOREX_SIM_BALANCE = 500;
const FOREX_SIM_LEVERAGE = 100;
const CRYPTO_SIM_BALANCE = 250;
const CRYPTO_SIM_LEVERAGE = 100;
// Kripto istatistiklerini "temiz" (net) kara cevirmek icin dusulen borsa
// maliyetleri (kullanici istegi 2026-08-19: acma/kapama ucreti + funding
// R-multiple'a dahil degildi, brut hesap iyimser gosteriyordu). Forex'te
// vadeli islem funding'i / bu tip taker ucreti yok, bu yuzden sadece
// market === 'CRYPTO' icin uygulanir.
// Binance USDT-M vadeli standart (VIP0) taker ucreti - giris ve cikis ayri
// ayri islem sayilir, ikisi de worst-case taker varsayilir (limit/maker
// oldugu bilinmiyor).
const CRYPTO_TAKER_FEE_PCT = 0.0005; // %0.05 / islem tarafi
// Gercek gecmis funding orani sinyal basina saklanmiyor (fetchBinanceFundingRate
// sadece ANLIK orani cekiyor, backtest/kapanmis sinyallere uygulanamaz) - bu
// yuzden Binance perpetual'larda gozlenen uzun donem ortalamaya yakin sabit
// bir varsayim kullaniliyor. Pozisyon acikken her 8 saatte bir tahakkuk eder.
const CRYPTO_FUNDING_RATE_PCT_PER_8H = 0.0001; // %0.01 / 8 saat (ortalama varsayim)
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
    private readonly autoTradeService: AutoTradeService,
  ) {}

  // Bu dosyadaki TUM dis servis (Binance/Yahoo/Anthropic) cagrilari icin ortak
  // zaman asimi - hicbirinde AbortController/timeout yoktu, agda takilan tek
  // bir istek (75 sembollik dongude sirayla islenen) tum taramayi süresiz
  // bekletebilirdi (bkz. kullanici geri bildirimi 2026-08-21: scanner'daki
  // diger riskli noktalar). Cagiran taraflarin hepsi zaten try/catch icinde -
  // AbortError de ayni sekilde yakalanip fail-safe (null/[]) donuyor.
  private fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
    return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  }

  private async fetchTopBinanceSymbols(limit: number): Promise<string[]> {
    try {
      const res = await this.fetchWithTimeout('https://api.binance.com/api/v3/ticker/24hr');
      if (!res.ok) return [];
      const data = await res.json();
      return data
        .filter((t: any) =>
          t.symbol.endsWith('USDT') &&
          !t.symbol.includes('UPUSDT') &&
          !t.symbol.includes('DOWNUSDT') &&
          !NON_CRYPTO_BASE_ASSETS.has(t.symbol.slice(0, -4)),
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
    const res = await this.fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    const closed = data.slice(0, -1);
    return closed.map((c: any) => ({
      time: c[0], open: parseFloat(c[1]), high: parseFloat(c[2]),
      low: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5]),
    }));
  }

  // BTC piyasa trend filtresi icin - interval=1h. Eskiden kaldirilan 15dk
  // EMA50 filtresi cok gurultuluydu (12.5 saatlik pencere, neredeyse surekli
  // tetikleniyordu); 1 saatlik EMA50 daha yuksek zaman diliminde, daha
  // istikrarli bir "piyasa rejimi" olcumu.
  private async fetchBinance1h(symbol: string, limit: number): Promise<Candle[]> {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;
    const res = await this.fetchWithTimeout(url);
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
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) return null;
      const data = await res.json();
      return parseFloat(data.lastFundingRate) * 100;
    } catch {
      return null;
    }
  }

  // Kapanmis kripto sinyallerin GERCEK funding maliyetini hesaplamak icin -
  // Binance her sembol icin 8 saatte bir (00:00/08:00/16:00 UTC) tahakkuk
  // eden gecmis funding oranini herkese acik bu endpoint'ten sunuyor (kullanici
  // istegi 2026-08-19: sabit varsayim yerine gercek deger). limit=1000 8
  // saatlik periyotlarla ~11 ay kapsar, bizim sinyal pencerelerimiz (gun/hafta)
  // icin fazlasiyla yeterli.
  // null = istek basarisiz oldu (agdaki cagiran sabit varsayima dussun); []
  // = istek basarili ama bu pencerede GERCEKTEN hic funding tahakkuku yok
  // (8 saatlik siniri hic gecmemis kisa sureli DAY-trade pozisyonlari icin
  // normal ve dogru bir durum - bu ikisi karistirilmamali).
  private async fetchBinanceHistoricalFundingRates(
    symbol: string,
    startTime: number,
    endTime: number,
  ): Promise<{ fundingTime: number; fundingRate: number }[] | null> {
    try {
      const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&startTime=${startTime}&endTime=${endTime}&limit=1000`;
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) return null;
      const data = await res.json();
      return data.map((r: any) => ({ fundingTime: r.fundingTime, fundingRate: parseFloat(r.fundingRate) }));
    } catch {
      return null;
    }
  }

  private async fetchYahoo(yahooSymbol: string, range: string, interval: string): Promise<Candle[]> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${interval}`;
    const res = await this.fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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

  // BTC Piyasa Filtresi: iki ayri kontrol.
  // 1) Ani cokus (Black Swan): BTC'nin son kapanan 15dk mumu
  // %ICT_BTC_DROP_PCT'ten fazla dustuyse piyasa "guvensiz" sayilir (2026-08-09
  // revizyonu - eskiden burada ayrica 15dk EMA50 sarti da vardi, o
  // kaldirilmisti cunku neredeyse her zaman tetiklenip taramayi baytan iptal
  // ediyordu / over-filtering).
  // 2) BTC Trend Filtresi (2026-08-10, backtest sonucu eklendi): BTC kendi 1
  // saatlik EMA50'sinin altindaysa piyasa "guvensiz" sayilir - eskiki 15dk
  // EMA50'den farkli olarak bu daha yuksek zaman dilimi oldugu icin surekli
  // tetiklenmiyor, gercek bir trend rejimi olcuyor.
  // Veri cekilemezse yine fail-safe olarak guvensiz varsayilir.
  private async isBtcMarketSafe(): Promise<boolean> {
    try {
      const btc15m = await this.fetchBinance15m('BTCUSDT', 5);
      if (btc15m.length < 1) return false;
      const last = btc15m[btc15m.length - 1];
      const candleChangePct = ((last.close - last.open) / last.open) * 100;
      if (candleChangePct < -ICT_BTC_DROP_PCT) return false;

      const btc1h = await this.fetchBinance1h('BTCUSDT', ICT_BTC_TREND_EMA_PERIOD + 20);
      if (btc1h.length < ICT_BTC_TREND_EMA_PERIOD + 1) return false;
      const closes1h = btc1h.map((c) => c.close);
      const ema50Series = this.ema(closes1h, ICT_BTC_TREND_EMA_PERIOD);
      const lastEma50 = ema50Series[ema50Series.length - 1];
      const lastClose1h = closes1h[closes1h.length - 1];
      if (lastClose1h < lastEma50) return false;

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
    const riskPct = risk / entry;
    if (riskPct < ICT_MIN_RISK_PCT || riskPct > ICT_MAX_RISK_PCT) return null;
    const tp1 = entry + risk * ICT_TP1_RR_MULT;
    const tp2 = entry + risk * ICT_TP2_RR_MULT;
    const tp3 = entry + risk * ICT_RR_MULT;

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
      `Risk/Ödül: TP1 1:${ICT_TP1_RR_MULT}, TP2 1:${ICT_TP2_RR_MULT}, TP3 (final) 1:${ICT_RR_MULT}`,
    ];

    return {
      direction: 'LONG',
      currentPrice,
      entry,
      entryZoneTop,
      entryZoneBottom,
      stop,
      tp1,
      tp2,
      tp3,
      rr: ICT_RR_MULT,
      reasons,
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
      // Diger cagrilardan farkli olarak LLM yaniti icin ortak 10sn cok kisa
      // olabilir - 30sn.
      const response = await this.fetchWithTimeout(
        'https://api.anthropic.com/v1/messages',
        {
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
        },
        30000,
      );

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
    const symbolList = await this.fetchTopBinanceSymbols(ICT_TOP_SYMBOLS);
    const rawCandidateCount = symbolList.length;

    const marketSafe = await this.isBtcMarketSafe();
    if (!marketSafe) {
      console.log(`[scanDayTrade] BTC piyasa filtresi tetiklendi (ani cokus %${ICT_BTC_DROP_PCT}+ veya 1sa EMA${ICT_BTC_TREND_EMA_PERIOD} altinda), tarama atlandi`);
      console.log(`[scanDayTrade] Filtre öncesi ham aday sayısı: ${rawCandidateCount}`);
      console.log(`[scanDayTrade] BTC/DXY filtresine takılanlar: ${rawCandidateCount}`);
      console.log(`[scanDayTrade] Hacim/Trend filtresine takılanlar: 0`);
      console.log(`[scanDayTrade] Korelasyondan elenenler: 0`);
      console.log(`[scanDayTrade] Kuyruğa/SUPER_ADMIN'e başarıyla gönderilen sinyal sayısı: 0`);
      return [];
    }

    const candidates: any[] = [];
    const returnsMap: Record<string, number[]> = {};
    // MSB + hacim + FVG + EMA200 trend sartlarinin hepsi buildIctBreakoutRetestSetup
    // icinde tek fonksiyonda birlesik oldugu icin bu sayac hepsini kapsar.
    let structureFiltered = 0;

    for (const symbol of symbolList) {
      try {
        const candles = await this.fetchBinance15m(symbol, 300);
        if (candles.length < ICT_MIN_CANDLES) { structureFiltered++; continue; }

        const setup = this.buildIctBreakoutRetestSetup(candles);
        if (!setup) { structureFiltered++; continue; }

        const closes = candles.slice(-60).map((c) => c.close);
        returnsMap[symbol] = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);

        candidates.push({ symbol, ...setup, winRatePercent: null, fundingRate: null, style: 'DAY' });
      } catch { structureFiltered++; continue; }
      await new Promise((r) => setTimeout(r, 150));
    }

    const selected: any[] = [];
    for (const c of candidates) {
      const tooCorrelated = selected.some((s) => this.correlation(returnsMap[s.symbol] ?? [], returnsMap[c.symbol] ?? []) > CORRELATION_THRESHOLD);
      if (!tooCorrelated) selected.push(c);
    }
    const correlationFiltered = candidates.length - selected.length;

    console.log(`[scanDayTrade] Filtre öncesi ham aday sayısı: ${rawCandidateCount}`);
    console.log(`[scanDayTrade] BTC/DXY filtresine takılanlar: 0`);
    console.log(`[scanDayTrade] Hacim/Trend filtresine takılanlar: ${structureFiltered}`);
    console.log(`[scanDayTrade] Korelasyondan elenenler: ${correlationFiltered}`);
    console.log(`[scanDayTrade] Kuyruğa/SUPER_ADMIN'e başarıyla gönderilen sinyal sayısı: ${selected.length}`);

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
  //  1) 15dk Likidite Supurme: bir onceki seansin en dusuk seviyesinin altina
  //     bir 15dk mumun FITILI sarkmali (kapanisin altinda olmasina gerek yok).
  //  2) 15dk MSB (Market Structure Break, 2026-08-09 revizyonu): supurmeden
  //     sonraki kirilim mumu (FVG'nin 3. mumu), onceki FX_MSS_LOOKBACK mumun
  //     en yuksek seviyesini yukari yonlu kirip uzerinde kapanmis olmali -
  //     kriptodaki MSB kontroluyle ayni mantik, artik ayri bir 1 saatlik
  //     zaman dilimine degil dogrudan ayni 15dk seriye bakiliyor (onceki
  //     surumde 1S ve 15dk arasinda zaman dilimi celiskisi olusuyordu).
  //  3) Tersine Donus + FVG: supurmeden SONRA gelen 3 mumluk yapida (kripto ile
  //     ayni yorum: candle[n-3]->candle[n-2]->candle[n-1], candle[n-1] hem
  //     MSB/tersine donus hem FVG'nin 3. mumu) FVG olusmali: candle[n-1].low >
  //     candle[n-3].high.
  // Entry = FVG kutusunun %50 orta noktasi (kripto'dan farkli - kripto'da ust
  // siniriydi). Stop = supurme mumunun en uc low'u - FX_STOP_PIP_BUFFER pip.
  // TP = Entry + Risk * FX_RR_MULT (net 1:3).
  private buildForexLiquiditySweepSetup(symbol: string, fifteenMin: Candle[]): Setup | null {
    if (fifteenMin.length < FX_MSS_LOOKBACK + 5) return null;

    // 1) Onceki seansin en dusuk seviyesi + likidite supurme (fitil bazli,
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

    // 2) 15dk MSB - kirilim mumu (c3), onceki FX_MSS_LOOKBACK mumun en
    // yuksek seviyesini yukari yonlu kirip uzerinde kapanmis olmali.
    const c3 = fifteenMin[n - 1];
    const priorHighs = fifteenMin.slice(n - 1 - FX_MSS_LOOKBACK, n - 1).map((c) => c.high);
    if (priorHighs.length < FX_MSS_LOOKBACK) return null;
    if (!(c3.close > Math.max(...priorHighs))) return null;

    // 3) Tersine donus + FVG (kripto ile ayni yorum)
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
    const riskPct = risk / entry;
    if (riskPct < FX_MIN_RISK_PCT || riskPct > FX_MAX_RISK_PCT) return null;
    const tp1 = entry + risk * FX_TP1_RR_MULT;
    const tp2 = entry + risk * FX_TP2_RR_MULT;
    const tp3 = entry + risk * FX_RR_MULT;

    const currentPrice = c3.close;
    const stillValid = currentPrice <= entryZoneTop && currentPrice >= entryZoneBottom;
    const distancePercent = stillValid
      ? 0
      : Math.round((Math.abs(currentPrice - entry) / entry) * 10000) / 100;

    const reasons: string[] = [
      `Likidite Süpürme: fiyat önceki seansın en düşük seviyesinin (${prevSessionLow.toFixed(5)}) altına sarktı`,
      `15dk MSB: kırılım mumunun kapanışı, önceki ${FX_MSS_LOOKBACK} mumun en yüksek seviyesini yukarı yönlü kırdı`,
      `Fair Value Gap: giriş bölgesi ${entryZoneBottom.toFixed(5)} - ${entryZoneTop.toFixed(5)} (%50 orta nokta: ${entry.toFixed(5)})`,
      `Risk/Ödül: TP1 1:${FX_TP1_RR_MULT}, TP2 1:${FX_TP2_RR_MULT}, TP3 (final) 1:${FX_RR_MULT}`,
    ];

    return {
      direction: 'LONG',
      currentPrice,
      entry,
      entryZoneTop,
      entryZoneBottom,
      stop,
      tp1,
      tp2,
      tp3,
      rr: FX_RR_MULT,
      reasons,
      stillValid,
      distancePercent,
      patternType: 'FX_LIQUIDITY_SWEEP',
    };
  }

  // Forex Day Trade: ICT Likidite Supurme modeli. Guvenlik/uyari filtreleri
  // (spec sirasiyla): 1) bilinen yuksek etkili haber gunu ise tarama tamamen
  // atlanir, 2) TSI 23:55-01:05 (banka gun sonu spread genislemesi) ise
  // atlanir, 3) DXY kendi 15dk EMA50'sinin ustundeyse (dolar guclu/yukselen)
  // EURUSD/GBPUSD sinyallerine bilgilendirme notu eklenir (2026-08-09
  // revizyonu: onceden bu durumda sinyal TAMAMEN engelleniyordu - artik
  // hard-filtre degil, sadece setup.reasons'a uyari satiri ekleniyor).
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
    } catch { /* dxyBelowEma50 null kalir - veri yoksa DXY notu eklenmez */ }

    const symbols = Object.keys(YAHOO_MAP);
    const rawCandidateCount = symbols.length;
    const candidates: any[] = [];
    const returnsMap: Record<string, number[]> = {};
    // DXY artik hard-filtre degil, sadece bilgilendirme notu - bu sayac
    // notun eklendigi (elenmeyen) sinyal sayisini takip eder.
    let dxyNoted = 0;
    // Likidite supurme + 15dk MSB + FVG sartlarinin hepsi
    // buildForexLiquiditySweepSetup icinde birlesik oldugu icin bu sayac
    // hepsini kapsar.
    let structureFiltered = 0;

    for (const symbol of symbols) {
      const dxyWarning = FX_DXY_FILTERED_SYMBOLS.has(symbol) && dxyBelowEma50 === false;
      if (dxyWarning) dxyNoted++;

      const yahooSymbol = YAHOO_MAP[symbol];
      try {
        const fifteenMin = await this.fetchYahoo(yahooSymbol, '5d', '15m');
        if (fifteenMin.length < FX_MSS_LOOKBACK + 5) { structureFiltered++; continue; }

        const setup = this.buildForexLiquiditySweepSetup(symbol, fifteenMin);
        if (!setup) { structureFiltered++; continue; }
        if (dxyWarning) {
          setup.reasons.push('DXY Uyarısı: DXY kendi 15dk EMA50 üzerinde (dolar güçlü) - bilgi amaçlı, sinyal engellenmedi');
        }

        const closes = fifteenMin.slice(-60).map((c) => c.close);
        returnsMap[symbol] = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);

        candidates.push({ symbol, ...setup, winRatePercent: null, fundingRate: null, style: 'DAY' });
      } catch { structureFiltered++; continue; }
      await new Promise((r) => setTimeout(r, 150));
    }

    const selected: any[] = [];
    for (const c of candidates) {
      const tooCorrelated = selected.some((s) => this.correlation(returnsMap[s.symbol] ?? [], returnsMap[c.symbol] ?? []) > CORRELATION_THRESHOLD);
      if (!tooCorrelated) selected.push(c);
      if (selected.length === 25) break;
    }
    const correlationFiltered = candidates.length - selected.length;

    console.log(`[scanForexDayTrade] Filtre öncesi ham aday sayısı: ${rawCandidateCount}`);
    console.log(`[scanForexDayTrade] BTC/DXY filtresine takılanlar: ${dxyNoted} (DXY artık bilgilendirme amaçlı, sinyal engellenmiyor)`);
    console.log(`[scanForexDayTrade] Hacim/Trend filtresine takılanlar: ${structureFiltered}`);
    console.log(`[scanForexDayTrade] Korelasyondan elenenler: ${correlationFiltered}`);
    console.log(`[scanForexDayTrade] Kuyruğa/SUPER_ADMIN'e başarıyla gönderilen sinyal sayısı: ${selected.length}`);

    for (const s of selected) {
      s.aiCommentary = await this.interpretWithAI(s.symbol, s);
    }

    return selected;
  }

  async getLivePrice(symbol: string, market: string = 'CRYPTO'): Promise<{ symbol: string; price: number | null }> {
    if (market === 'FOREX') return this.getLiveForexPrice(symbol);
    try {
      const res = await this.fetchWithTimeout(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
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

  // updateTrackedSignals() icin: son N adet 1dk mumu (High/Low/Close), eskiden-
  // yeniye sirali. Tek anlik ticker fiyati yerine bu kullanilarak taramalar
  // arasindaki wick'ler (TP/stop'a degip geri cekilme) kacirilmiyor.
  private async getRecentCandles(symbol: string, market: string, limit = 20): Promise<Candle[]> {
    if (market === 'FOREX') {
      const yahooSymbol = YAHOO_MAP[symbol];
      if (!yahooSymbol) return [];
      try {
        const candles = await this.fetchYahoo(yahooSymbol, '1d', '1m');
        return candles.slice(-limit);
      } catch {
        return [];
      }
    }
    try {
      // Bu fonksiyon updateTrackedSignals() icinde giris/TP/stop tespiti icin
      // kullaniliyor - Money Maker gercek emirleri FUTURES'ta actigi icin
      // (SPOT degil) burasi da Futures klines'a tasindi, aksi halde SPOT/
      // FUTURES fiyat farki (basis) yuzunden sinyal durumu ile gercek emrin
      // gordugu fiyat hafifce ayrisabilirdi (bkz. kullanici geri bildirimi
      // 2026-08-21: scanner'daki diger riskli noktalar). Sinyal ureten
      // fetchBinance15m/1h SPOT'ta kalmaya devam ediyor - o taraf gecmis
      // backtest/istatistiklerle tutarliligi bozmamak icin bilincli olarak
      // degistirilmedi.
      const res = await this.fetchWithTimeout(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1m&limit=${limit}`);
      if (!res.ok) return [];
      const data = (await res.json()) as any[];
      return data.map((k) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch {
      return [];
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
    const previousDetectedSymbols = new Set(
      ((previousScan?.results as any)?.crypto ?? []).map((c: any) => c.symbol),
    );

    const results = await this.runDayTradeScan();
    // stillValid=false (fiyat henuz FVG giris bolgesine geri cekilmedi) demek
    // sinyalin GECERSIZ oldugu anlamina gelmez - sadece henuz TETIKLENMEDIGI
    // anlamina gelir. Eskiden burada stillValid ile filtrelenip bu adaylar
    // tamamen atilirdi; bu yuzden kullanici sinyali ancak fiyat zaten bolgeye
    // girmisken (yani tetiklenirken/tetiklendikten hemen sonra) goruyordu ve
    // islemi kaciriyordu. Artik yapisal olarak onaylanan HER setup hemen
    // WATCHING olarak izlemeye alinir; updateTrackedSignals() fiyat gercekten
    // bolgeye girdiginde WATCHING->TRIGGERED gecisini zaten yapiyor.
    const detectedSignals = results.crypto;

    const openTracked = await this.prisma.trackedSignal.findMany({
      where: { style: 'DAY', market: 'CRYPTO', status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      select: { symbol: true },
    });
    const trackedSymbols = new Set(openTracked.map((t) => t.symbol));
    const recentlyClosed = await this.prisma.trackedSignal.findMany({
      where: { style: 'DAY', market: 'CRYPTO', closedAt: { gte: new Date(Date.now() - SIGNAL_REENTRY_COOLDOWN_MS) } },
      select: { symbol: true },
    });
    const cooldownSymbols = new Set(recentlyClosed.map((t) => t.symbol));
    const blockedSymbols = new Set([...trackedSymbols, ...cooldownSymbols]);
    const newDetectedSignals = detectedSignals.filter(
      (c: any) => !previousDetectedSymbols.has(c.symbol) && !blockedSymbols.has(c.symbol),
    );
    const signalsNeedingTracking = detectedSignals.filter((c: any) => !blockedSymbols.has(c.symbol));
    if (signalsNeedingTracking.length > 0) {
      await this.createTrackedSignals(signalsNeedingTracking, 'DAY', 'CRYPTO');
    }
    // Swing tamamen kaldirildigi icin acik sinyallerin (kripto+forex, hepsi
    // artik DAY) WATCHING->TRIGGERED->HIT_TP/HIT_STOP guncellemesi buradan
    // yapiliyor - bu, 15 dakikada bir calisan tikimlerden biri.
    await this.updateTrackedSignals();

    if (newDetectedSignals.length === 0) return;

    const admins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    });

    const symbolList = newDetectedSignals.map((c: any) => `${c.symbol} (${c.direction})`).join(', ');
    const message = `${newDetectedSignals.length} yeni aktif Day Trade sinyali: ${symbolList}`;

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
    const previousDetectedSymbols = new Set(
      ((previousScan?.results as any)?.crypto ?? []).map((c: any) => c.symbol),
    );

    const results = await this.runForexDayTradeScan();
    // bkz. scheduledDayTradeScan() - stillValid=false artik "elenir" degil
    // "henuz tetiklenmedi, WATCHING'e alinir" anlamina geliyor.
    const detectedSignals = results.crypto;

    const openTracked = await this.prisma.trackedSignal.findMany({
      where: { style: 'DAY', market: 'FOREX', status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      select: { symbol: true },
    });
    const trackedSymbols = new Set(openTracked.map((t) => t.symbol));
    const recentlyClosed = await this.prisma.trackedSignal.findMany({
      where: { style: 'DAY', market: 'FOREX', closedAt: { gte: new Date(Date.now() - SIGNAL_REENTRY_COOLDOWN_MS) } },
      select: { symbol: true },
    });
    const cooldownSymbols = new Set(recentlyClosed.map((t) => t.symbol));
    const blockedSymbols = new Set([...trackedSymbols, ...cooldownSymbols]);
    const newDetectedSignals = detectedSignals.filter(
      (c: any) => !previousDetectedSymbols.has(c.symbol) && !blockedSymbols.has(c.symbol),
    );
    const signalsNeedingTracking = detectedSignals.filter((c: any) => !blockedSymbols.has(c.symbol));
    if (signalsNeedingTracking.length > 0) {
      await this.createTrackedSignals(signalsNeedingTracking, 'DAY', 'FOREX');
    }
    // NOT: updateTrackedSignals() burada CAGIRILMIYOR - scheduledDayTradeScan
    // (kripto day-trade) zaten TUM acik kayitlari (market farketmeksizin) her
    // 15 dakikada guncelliyor

    if (newDetectedSignals.length === 0) return;

    const admins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    });

    const symbolList = newDetectedSignals.map((c: any) => `${c.symbol} (${c.direction})`).join(', ');
    const message = `${newDetectedSignals.length} yeni aktif Forex Day Trade sinyali: ${symbolList}`;

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
      const created = await this.prisma.trackedSignal.create({
        data: {
          symbol: s.symbol,
          direction: s.direction,
          entry: s.entry,
          entryZoneTop: s.entryZoneTop,
          entryZoneBottom: s.entryZoneBottom,
          stop: s.stop,
          tp1: s.tp1,
          tp2: s.tp2,
          tp3: s.tp3,
          rr: s.rr,
          style,
          market: market as any,
          status: 'WATCHING',
          strategyName: s.patternType ?? 'SUPPLY_DEMAND_ZONE',
        },
      });
      // Otomatik islem kapaliysa (AutoTradeConfig.enabled=false, varsayilan)
      // bu cagri hicbir sey yapmadan hemen doner - bkz. AutoTradeService.isActive.
      await this.autoTradeService.onSignalCreated(created);
    }
  }

  async updateTrackedSignals() {
    // Hicbir zaman tetiklenmemis (INVALIDATED) veya suresi dolmus (EXPIRED)
    // kayitlar panelde gosterilmiyor (bkz. getTrackedSignals) ama ayni sembol
    // icin 24 saatlik yeniden-tetiklenme bekleme suresi (SIGNAL_REENTRY_COOLDOWN_MS)
    // bu kayitlarin closedAt'ina bakiyor - o yuzden bekleme suresi gecmeden
    // silinmiyorlar, gectikten sonra artik hicbir ise yaramadiklari icin
    // veritabanindan temizleniyor.
    await this.prisma.trackedSignal.deleteMany({
      where: {
        status: { in: ['INVALIDATED', 'EXPIRED'] },
        closedAt: { lt: new Date(Date.now() - SIGNAL_REENTRY_COOLDOWN_MS) },
      },
    });

    const openSignals = await this.prisma.trackedSignal.findMany({
      where: { closedAt: null, status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
    });

    for (const sig of openSignals) {
      const bullish = sig.direction === 'LONG';
      // Tek anlik ticker fiyati yerine son ~20 dakikanin 1dk mumlari (High/Low)
      // kullaniliyor - iki tarama arasinda (15dk araliklarla calisiyor, bkz.
      // scanner-scheduler.service.ts) fiyat bir TP/stop seviyesine degip geri
      // cekilirse (wick) tek anlik fiyatla bu tamamen kaciriliyordu (bkz.
      // kullanici geri bildirimi 2026-08-14). Mumlar eskiden-yeniye sirayla
      // islenip TP1->stop gibi ayni pencere icindeki olay sirasi da korunuyor.
      const candles = await this.getRecentCandles(sig.symbol, sig.market);
      if (candles.length === 0) continue;

      // Tetiklenmis ama henuz stop/TP'ye ulasmamis, stile gore sure asimi:
      // SWING 10 gun, DAY 1 gun (day trade pozisyonlari uzun sure acik kalmamali).
      // TP1/TP2 zaten bankaya yatmissa (stop basabasta) bu sure asimi UYGULANMAZ -
      // aksi halde kazanan bir sinyal, final TP'ye/basabasa ulasmadan sure dolunca
      // EXPIRED'a cevrilip istatistiklerden ve DB'den siliniyordu (bkz. kullanici
      // geri bildirimi 2026-08-13 - ilk gun TP1 alinan bir sinyal boyle "silinmisti").
      // Wall-clock'a bagli oldugu icin mum basina degil tek seferlik kontrol ediliyor.
      if (sig.status !== 'WATCHING' && sig.triggeredAt && sig.status !== 'HIT_TP1' && sig.status !== 'HIT_TP2') {
        const triggeredAgeMs = Date.now() - sig.triggeredAt.getTime();
        const expiryMs = sig.style === 'DAY' ? 1 * 24 * 60 * 60 * 1000 : 10 * 24 * 60 * 60 * 1000;
        if (triggeredAgeMs > expiryMs) {
          await this.prisma.trackedSignal.update({
            where: { id: sig.id },
            data: { status: 'EXPIRED', closedAt: new Date() },
          });
          await this.autoTradeService.onSignalInvalidated(sig.id);
          continue;
        }
      }

      let status: string = sig.status;
      let stop = sig.stop;
      const updates: Record<string, any> = {};
      let closed = false;

      for (const c of candles) {
        if (closed) break;

        // Yeni olusturulan bir sinyal, ayni tarama dongusunde (scheduledDayTradeScan
        // -> createTrackedSignals hemen ardindan updateTrackedSignals) burada da
        // isleniyor - getRecentCandles son ~20 dakikalik 1dk mumu dondurdugu icin,
        // sinyal SADECE BIRAZ once olusturulmus olsa bile bu pencere sinyalin
        // olusturulmasindan ONCEKI fiyat hareketini icerebilir. O mumlarla
        // entered/passedAnyTp/hitStopBeforeEntry kontrolu yapilirsa, gercek Binance
        // emri borsada hic var olmadan sinyal WATCHING->TRIGGERED->HIT_TP3'e kadar
        // tek pass'te "kazanmis" gorunebilir (bkz. kullanici geri bildirimi
        // 2026-08-21: Money Maker'da kacan islem analizi - DB'de sinyal HIT_TP3
        // derken gercek emir hic dolmamisti). Henuz tetiklenmemisken (WATCHING)
        // sinyalin olusturulmasindan ONCE kapanan mumlar bu yuzden atlanir.
        if (status === 'WATCHING' && c.time < sig.createdAt.getTime()) continue;

        if (status === 'WATCHING') {
          // Giris hic tetiklenmeden fiyat herhangi bir TP seviyesini gecmisse (ETCUSDT'de
          // gozlenen durum) VEYA giris bolgesine hic girmeden dogrudan stop seviyesini
          // kirmisse (yapi zaten gecersiz - bkz. kullanici geri bildirimi 2026-08-10),
          // bu setup artik gerceklestirilemez - normal mesafe/sure esiklerini beklemeden
          // hemen iptal edilir
          const passedAnyTp = bullish
            ? c.high >= Math.min(sig.tp1, sig.tp2, sig.tp3)
            : c.low <= Math.max(sig.tp1, sig.tp2, sig.tp3);
          const hitStopBeforeEntry = bullish ? c.low <= stop : c.high >= stop;
          if (passedAnyTp || hitStopBeforeEntry) {
            status = 'INVALIDATED';
            Object.assign(updates, { status, closedAt: new Date() });
            closed = true;
            break;
          }

          const entered = c.low <= sig.entryZoneTop && c.high >= sig.entryZoneBottom;
          if (entered) {
            status = 'TRIGGERED';
            Object.assign(updates, { status, triggeredAt: new Date(c.time) });
            continue;
          }
          continue;
        }

        const hitStop = bullish ? c.low <= stop : c.high >= stop;
        if (hitStop) {
          // TP1 alindiktan sonra stop basabasa cekilmis oluyor (asagida) - fiyat
          // oraya donerse bu gercek bir kayip DEGIL, en son ulasilan TP'de kapanir
          const alreadyBankedTp = status === 'HIT_TP1' || status === 'HIT_TP2';
          if (alreadyBankedTp) {
            Object.assign(updates, { closedAt: new Date() });
          } else {
            status = 'HIT_STOP';
            Object.assign(updates, { status, closedAt: new Date() });
          }
          closed = true;
          break;
        }

        const hitTp3 = bullish ? c.high >= sig.tp3 : c.low <= sig.tp3;
        const hitTp2 = bullish ? c.high >= sig.tp2 : c.low <= sig.tp2;
        const hitTp1 = bullish ? c.high >= sig.tp1 : c.low <= sig.tp1;

        if (hitTp3) {
          status = 'HIT_TP3';
          Object.assign(updates, { status, closedAt: new Date() });
          closed = true;
          break;
        } else if (hitTp2 && status !== 'HIT_TP2') {
          status = 'HIT_TP2';
          Object.assign(updates, { status });
        } else if (hitTp1 && status === 'TRIGGERED') {
          // TP1 vuruldu: stop'u basabasa (giris bolgesi ortalamasina) cek -
          // artik bu islemde kayip riski yok, en kotu ihtimalle basabas kapanir
          stop = (sig.entryZoneTop + sig.entryZoneBottom) / 2;
          status = 'HIT_TP1';
          Object.assign(updates, { status, stop });
        }
      }

      // Hic bir mumda tetiklenmeden WATCHING kaldiysa, mesafe/sure asimi kontrolu
      // son mumun kapanisina (guncel fiyata yakin) ve wall-clock'a gore yapilir.
      if (status === 'WATCHING' && !closed) {
        const lastClose = candles[candles.length - 1].close;
        const zoneMid = (sig.entryZoneTop + sig.entryZoneBottom) / 2;
        const distancePercent = Math.abs(lastClose - zoneMid) / zoneMid * 100;
        const watchingAgeMs = Date.now() - sig.createdAt.getTime();
        const watchingExpiryMs = 3 * 24 * 60 * 60 * 1000;
        if (distancePercent > 8 || watchingAgeMs > watchingExpiryMs) {
          Object.assign(updates, { status: 'INVALIDATED', closedAt: new Date() });
        }
      }

      if (Object.keys(updates).length > 0) {
        await this.prisma.trackedSignal.update({ where: { id: sig.id }, data: updates });
        // Giris hic gerceklesmeden setup gecersizlesti/suresi doldu - gercek
        // Binance emri acilmissa (bkz. AutoTradeService.onSignalCreated) iptal
        // edilmesi gerekir, yoksa borsada sahipsiz bir bekleyen emir kalir.
        if (updates.status === 'INVALIDATED' || updates.status === 'EXPIRED') {
          await this.autoTradeService.onSignalInvalidated(sig.id);
        }
      }
    }
  }

  private async computeSignalStats(style: string, market: string) {
    const baseWhere: any = { style, market: market as any };

    // R-multiple hesabi: TP1 her zaman girisin tam 1R uzaginda (bkz.
    // ICT_TP1_RR_MULT/FX_TP1_RR_MULT, ikisi de =1), yani risk birimi (1R)
    // piyasadan bagimsiz sabit bir oran - ayri ayri entry/stop fiyatina
    // gerek yok. Pozisyon 3 dilime bolunuyor: TP1'de %50 (1R), TP2'de %25
    // (kripto 1.5R / forex 2R - bkz. ICT_TP2_RR_MULT/FX_TP2_RR_MULT), TP3'te
    // (final) kalan %25 (kripto 2R / forex 3R - sig.rr). Her asamada bir
    // onceki dilim zaten bankaya yatirildigi icin R'lar kumulatif toplanir -
    // ornek kullanici geri bildirimi 2026-08-14: TP2 vurulan bir sinyalde
    // "Kazanilan" hep TP1'in 0.5R'inda kalip TP2'nin hic karsiligi
    // olmuyordu, artik TP2 de kendi diliminin R'ini ekliyor. Fiyat basabasa
    // donerse kapanmamis dilim(ler) 0R'da kapanir (kayip degil, kar da
    // degil) - HIT_STOP statusune sadece TP1 hic bankaya yatirilmadan
    // ulasilabiliyor, yani her zaman TAM 1R kayip.
    const TP1_BANKED_FRACTION = 0.5;
    const TP2_BANKED_FRACTION = 0.25;
    const TP2_RR_MULT = market === 'FOREX' ? FX_TP2_RR_MULT : ICT_TP2_RR_MULT;
    const simBalance = market === 'FOREX' ? FOREX_SIM_BALANCE : CRYPTO_SIM_BALANCE;
    const simLeverage = market === 'FOREX' ? FOREX_SIM_LEVERAGE : CRYPTO_SIM_LEVERAGE;
    const simNotional = simBalance * simLeverage;
    const [activeCount, closedRows] = await Promise.all([
      this.prisma.trackedSignal.count({
        where: { ...baseWhere, closedAt: null, status: { in: ['WATCHING', 'TRIGGERED', 'HIT_TP1', 'HIT_TP2'] } },
      }),
      this.prisma.trackedSignal.findMany({
        where: {
          ...baseWhere,
          OR: [
            { status: 'HIT_STOP' },
            { status: { in: ['HIT_TP1', 'HIT_TP2', 'HIT_TP3'] }, closedAt: { not: null } },
          ],
        },
        select: {
          status: true, rr: true, entry: true, tp1: true,
          symbol: true, direction: true, triggeredAt: true, closedAt: true,
        },
      }),
    ]);

    // Gercek gecmis funding: sembol basina, o sembolun bu sonuc kumesindeki
    // en erken tetiklenme - en gec kapanis araligini kapsayacak TEK istekle
    // Binance'ten cekilir (satir basina degil sembol basina - N sinyal ayni
    // sembolde olabiliyor, gereksiz tekrar istek atilmasin diye).
    const fundingBySymbol = new Map<string, { fundingTime: number; fundingRate: number }[] | null>();
    if (market === 'CRYPTO') {
      const rangeBySymbol = new Map<string, { start: number; end: number }>();
      for (const row of closedRows) {
        if (!row.triggeredAt || !row.closedAt) continue;
        const start = row.triggeredAt.getTime();
        const end = row.closedAt.getTime();
        const existing = rangeBySymbol.get(row.symbol);
        if (existing) {
          existing.start = Math.min(existing.start, start);
          existing.end = Math.max(existing.end, end);
        } else {
          rangeBySymbol.set(row.symbol, { start, end });
        }
      }
      await Promise.all(
        Array.from(rangeBySymbol.entries()).map(async ([symbol, { start, end }]) => {
          const events = await this.fetchBinanceHistoricalFundingRates(symbol, start, end);
          fundingBySymbol.set(symbol, events);
        }),
      );
    }

    const tp1 = { count: 0, r: 0, d: 0 };
    const tp2 = { count: 0, r: 0, d: 0 };
    const tp3 = { count: 0, r: 0, d: 0 };
    const stopped = { count: 0, r: 0, d: 0 };
    let totalFees = 0;
    let totalFunding = 0;
    for (const row of closedRows) {
      // Bu islemin dolar/R orani - risk mesafesi (giris-tp1) fiyata gore ne
      // kadar genisse, ayni notional icin 1R o kadar fazla dolar eder.
      const riskPct = row.entry && row.tp1 != null && row.entry > 0 ? Math.abs(row.tp1 - row.entry) / row.entry : 0;
      const dollarPer1R = simNotional * riskPct;
      // Ucret/funding kazanc-kayip farketmeksizin, pozisyon acildigi anda
      // tahakkuk eder - bu yuzden win/loss dallarindan BAGIMSIZ, her kapanan
      // sinyal icin bir kez hesaplanir.
      if (market === 'CRYPTO') {
        totalFees += simNotional * CRYPTO_TAKER_FEE_PCT * 2; // acilis + kapanis
        if (row.triggeredAt && row.closedAt) {
          const events = fundingBySymbol.get(row.symbol);
          const startMs = row.triggeredAt.getTime();
          const endMs = row.closedAt.getTime();
          if (events === null || events === undefined) {
            // Binance istegi basarisiz oldu (agdaki hata/bilinmeyen sembol) -
            // sabit ortalama varsayima geri dus.
            const openMs = endMs - startMs;
            const fundingPeriods = Math.max(1, Math.ceil(openMs / (8 * 60 * 60 * 1000)));
            totalFunding += simNotional * CRYPTO_FUNDING_RATE_PCT_PER_8H * fundingPeriods;
          } else {
            // Istek basarili - pencerede hic funding zamanina (00:00/08:00/16:00
            // UTC) denk gelmemis olabilir (8 saatten kisa acik kalan DAY-trade
            // pozisyonu) - bu durumda GERCEK maliyet gercekten sifirdir.
            const inWindow = events.filter((e) => e.fundingTime >= startMs && e.fundingTime <= endMs);
            // Funding orani pozitifse LONG oder/SHORT alir, negatifse tersi
            // (Binance konvansiyonu) - bu yuzden yon isarete yansitilir.
            const sideMult = row.direction === 'SHORT' ? -1 : 1;
            for (const e of inWindow) {
              totalFunding += simNotional * e.fundingRate * sideMult;
            }
          }
        }
      }
      if (row.status === 'HIT_STOP') {
        stopped.count += 1;
        stopped.r += 1;
        stopped.d += dollarPer1R;
      } else if (row.status === 'HIT_TP1') {
        tp1.count += 1;
        tp1.r += TP1_BANKED_FRACTION;
        tp1.d += TP1_BANKED_FRACTION * dollarPer1R;
      } else if (row.status === 'HIT_TP2') {
        const rNet = TP1_BANKED_FRACTION + TP2_BANKED_FRACTION * TP2_RR_MULT;
        tp2.count += 1;
        tp2.r += rNet;
        tp2.d += rNet * dollarPer1R;
      } else if (row.status === 'HIT_TP3') {
        const rNet =
          TP1_BANKED_FRACTION +
          TP2_BANKED_FRACTION * TP2_RR_MULT +
          (1 - TP1_BANKED_FRACTION - TP2_BANKED_FRACTION) * row.rr;
        tp3.count += 1;
        tp3.r += rNet;
        tp3.d += rNet * dollarPer1R;
      }
    }
    const wins = tp1.count + tp2.count + tp3.count;
    const losses = stopped.count;
    const total = activeCount + wins + losses;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
    const rWon = tp1.r + tp2.r + tp3.r;
    const rLost = stopped.r;
    const dWon = tp1.d + tp2.d + tp3.d;
    const dLost = stopped.d;
    const round2 = (n: number) => Math.round(n * 100) / 100;
    return {
      total,
      wins,
      losses,
      winRate,
      tp1: { count: tp1.count, r: round2(tp1.r), d: round2(tp1.d) },
      tp2: { count: tp2.count, r: round2(tp2.r), d: round2(tp2.d) },
      tp3: { count: tp3.count, r: round2(tp3.r), d: round2(tp3.d) },
      stopped: { count: stopped.count, r: round2(stopped.r), d: round2(stopped.d) },
      rWon: round2(rWon),
      rLost: round2(rLost),
      rNet: round2(rWon - rLost),
      // dWon/dLost brut (ucret/funding oncesi). dNet artik NET - fees ve
      // funding dusulmus (bkz. CRYPTO_TAKER_FEE_PCT/CRYPTO_FUNDING_RATE_PCT_PER_8H).
      // Forex'te fees=funding=0 oldugundan dNet degismeden kalir.
      dWon: round2(dWon),
      dLost: round2(dLost),
      dNet: round2(dWon - dLost - totalFees - totalFunding),
      fees: round2(totalFees),
      funding: round2(totalFunding),
      simBalance,
      simLeverage,
    };
  }

  async getTrackedSignals(style: string = 'DAY', market: string = 'CRYPTO') {
    const signals = await this.prisma.trackedSignal.findMany({
      // EXPIRED/INVALIDATED (hicbir zaman tetiklenmemis veya suresi dolmus
      // kurulumlar) panelde gosterilmiyor - ne izleniyor, ne tetiklendi, ne
      // TP/stop gordu, sadece gorsel karisiklik yaratiyorlardi (bkz. kullanici
      // geri bildirimi 2026-08-10). Bu kayitlar 24 saatlik yeniden-tetiklenme
      // bekleme suresi dolunca updateTrackedSignals() tarafindan veritabanindan
      // da siliniyor.
      where: { style, market: market as any, status: { notIn: ['EXPIRED', 'INVALIDATED'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    // Henuz girilmemis (WATCHING - giris emri/pozisyon yok) sinyaller en
    // ustte, zaten tetiklenmis/ilerlemis olanlar (TRIGGERED/HIT_TP*) altta -
    // ikisi createdAt'e gore karisik siralaninca panel karisik gorunuyordu
    // (kullanici geri bildirimi 2026-08-20: "ortalık karışıyor"). Her grubun
    // KENDI ICINDE createdAt'e gore en yeni en ustte kalmaya devam eder.
    signals.sort((a, b) => {
      const rank = (s: string) => (s === 'WATCHING' ? 0 : 1);
      const diff = rank(a.status) - rank(b.status);
      return diff !== 0 ? diff : b.createdAt.getTime() - a.createdAt.getTime();
    });
    const stats = await this.computeSignalStats(style, market);
    return { signals, stats };
  }


  // Kripto stratejisi (Supply/Demand -> ICT/SMC Breakout & Retest) tamamen
  // degistirildiginde eski kripto sinyallerini/tarama snapshotlarini bir kez
  // temizlemek icin. FOREX'e (market: 'FOREX') hicbir kosulda dokunmaz.
  async clearCryptoSignals() {
    // DB kayitlari silinmeden once borsadaki acik emirleri/pozisyonlari da
    // temizle - yoksa "sinyal silindi ama Binance'te hala emir/pozisyon var"
    // durumu olusur.
    await this.autoTradeService.cancelAllOpenForMarket('CRYPTO');
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
