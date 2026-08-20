import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';

// Binance USDT-M Futures REST istemcisi - imzali (signed) istekler icin
// HMAC-SHA256 kullanir (Binance'in resmi imzalama yontemi). API key/secret
// SADECE .env'den okunur (BINANCE_API_KEY/BINANCE_API_SECRET), DB'de tutulmaz.
// BINANCE_TESTNET !== 'false' oldugu surece testnet'e baglanir - gercek
// paraya gecmek icin kullanicinin bilincli olarak .env'de bu degeri 'false'
// yapmasi gerekir (bkz. AutoTradeService - ayrica DB'deki AutoTradeConfig.enabled
// de acik olmali, iki bagimsiz anahtar).
export interface SymbolFilters {
  stepSize: number;
  tickSize: number;
  minQty: number;
  minNotional: number;
}

@Injectable()
export class BinanceFuturesClientService {
  private readonly logger = new Logger(BinanceFuturesClientService.name);
  private readonly apiKey = process.env.BINANCE_API_KEY || '';
  private readonly apiSecret = process.env.BINANCE_API_SECRET || '';
  readonly testnet = process.env.BINANCE_TESTNET !== 'false';
  readonly restBase = this.testnet ? 'https://testnet.binancefuture.com' : 'https://fapi.binance.com';
  readonly wsBase = this.testnet ? 'wss://stream.binancefuture.com' : 'wss://fstream.binance.com';

  get isConfigured(): boolean {
    return !!this.apiKey && !!this.apiSecret;
  }

  private sign(params: Record<string, string | number>): string {
    const query = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    const signature = createHmac('sha256', this.apiSecret).update(query).digest('hex');
    return `${query}&signature=${signature}`;
  }

  private async signedRequest<T>(
    method: 'GET' | 'POST' | 'DELETE' | 'PUT',
    path: string,
    params: Record<string, string | number> = {},
  ): Promise<T> {
    if (!this.isConfigured) {
      throw new Error('BINANCE_API_KEY/BINANCE_API_SECRET tanimli degil');
    }
    const query = this.sign({ ...params, timestamp: Date.now(), recvWindow: 10000 });
    const res = await fetch(`${this.restBase}${path}?${query}`, {
      method,
      headers: { 'X-MBX-APIKEY': this.apiKey },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = body?.msg || res.statusText;
      throw new Error(`Binance API hatasi (${path}): ${msg} (code=${body?.code})`);
    }
    return body as T;
  }

  async getUsdtBalance(): Promise<number> {
    const rows = await this.signedRequest<{ asset: string; availableBalance: string }[]>(
      'GET',
      '/fapi/v2/balance',
    );
    const usdt = rows.find((r) => r.asset === 'USDT');
    return usdt ? parseFloat(usdt.availableBalance) : 0;
  }

  async setLeverage(symbol: string, leverage: number): Promise<void> {
    await this.signedRequest('POST', '/fapi/v1/leverage', { symbol, leverage });
  }

  // Binance'in izin verdigi max kaldirac sembol basina (hatta ayni sembolde
  // pozisyon buyuklugune gore kademeli) degisir - orn. BTCUSDT 125x'e kadar
  // izin verirken kucuk bir altcoin sadece 20x/50x'e izin verebilir. Sabit
  // bir kaldirac degeri (config.leverage) dogrudan gonderilirse Binance
  // "leverage not valid" hatasiyla reddedebilir - AutoTradeService bu yuzden
  // ayarlanan degeri her zaman sembolun izin verdigi tavana gore kirpiyor
  // (bkz. onSignalCreated). Ilk bracket (en dusuk notional dilimi) en yuksek
  // izin verilen kaldiraci verir - bizim pozisyon boyutlarimiz (sabit dolar
  // risk) neredeyse hep bu ilk dilimde kalir.
  private leverageBracketsCache = new Map<string, { initialLeverage: number; notionalCap: number }[]>();
  private async getLeverageBrackets(symbol: string): Promise<{ initialLeverage: number; notionalCap: number }[]> {
    const cached = this.leverageBracketsCache.get(symbol);
    if (cached) return cached;
    const rows = await this.signedRequest<{ symbol: string; brackets: { initialLeverage: number; notionalCap: number }[] }[]>(
      'GET',
      '/fapi/v1/leverageBracket',
      { symbol },
    );
    const brackets = rows[0]?.brackets ?? [{ initialLeverage: 20, notionalCap: Infinity }];
    this.leverageBracketsCache.set(symbol, brackets);
    return brackets;
  }

  async getMaxLeverage(symbol: string): Promise<number> {
    const brackets = await this.getLeverageBrackets(symbol);
    return brackets[0]?.initialLeverage ?? 20;
  }

  // Binance her sembolde kaldiraci NOTIONAL BUYUKLUGUNE gore kademeli sinirlar
  // (orn. UNIUSDT: 50x sadece $5000 notional'a kadar, sonrasi 25x'e, sonra
  // 20x'e duser) - getMaxLeverage SADECE en dusuk dilimin tavanini (genelde
  // en yuksek kaldirac) dondugu icin, sabit dolar risk sizing (onSignalCreated)
  // dar bir stop mesafesiyle buyuk bir notional urettiginde o notional'in asil
  // ait oldugu (daha dusuk kaldiracli) dilimi hesaba katmadan emir gonderiyor
  // ve Binance -2027 "Exceeded the maximum allowable position at current
  // leverage" ile reddediyordu (bkz. kullanici geri bildirimi 2026-08-20:
  // UNIUSDT ve APTUSDT). Bu fonksiyon, HEDEFLENEN notional'e gore o notional'in
  // sigdigi dilimin izin verdigi kaldiraci dondurur.
  async getLeverageForNotional(symbol: string, notional: number): Promise<number> {
    const brackets = await this.getLeverageBrackets(symbol);
    const fit = brackets.find((b) => notional <= b.notionalCap);
    return (fit ?? brackets[brackets.length - 1])?.initialLeverage ?? 20;
  }

  // Kismi dolan bir giris emri iptal edildiginde geride korumasiz bir pozisyon
  // kalip kalmadigini kontrol etmek icin (bkz. AutoTradeService.onSignalInvalidated
  // guvenlik agi) - normal akista qty hep 0 doner (ya hic dolmamis ya da onceden
  // ele alinmis olur).
  async getPositionAmt(symbol: string): Promise<number> {
    const risk = await this.getPositionRisk(symbol);
    return risk?.positionAmt ?? 0;
  }

  // Panelde "Binance'e hic girmeden" gorulebilecek canli pozisyon bilgisi
  // (anlik kar/zarar, mark fiyat, kaldirac, marjin) icin - kullanici istegi
  // 2026-08-20: "her kartta anlık ne kadar kazanıyoruz kaybediyoruz pozisyon
  // büyüklüğü gibi tüm futures bilgisi yer alsın".
  async getPositionRisk(symbol: string): Promise<{
    positionAmt: number;
    entryPrice: number;
    markPrice: number;
    unrealizedProfit: number;
    leverage: number;
    notional: number;
    liquidationPrice: number;
  } | null> {
    const rows = await this.signedRequest<
      {
        symbol: string;
        positionAmt: string;
        entryPrice: string;
        markPrice: string;
        unRealizedProfit: string;
        leverage: string;
        notional: string;
        liquidationPrice: string;
      }[]
    >('GET', '/fapi/v2/positionRisk', { symbol });
    const row = rows.find((r) => r.symbol === symbol);
    if (!row) return null;
    return {
      positionAmt: parseFloat(row.positionAmt),
      entryPrice: parseFloat(row.entryPrice),
      markPrice: parseFloat(row.markPrice),
      unrealizedProfit: parseFloat(row.unRealizedProfit),
      leverage: parseFloat(row.leverage),
      notional: Math.abs(parseFloat(row.notional)),
      liquidationPrice: parseFloat(row.liquidationPrice),
    };
  }

  // Panel kartinda SL/TP1/TP2/TP3 fiyatlarini GERCEKTEN borsada bekleyen
  // emirlerden okumak icin (kullanici istegi 2026-08-20: "stop tp nerede
  // yazıyor") - DB'deki sig.stop/tp1/tp2/tp3 statik degerler, TP1 dolunca
  // stop basabasa cekildigi icin (bkz. onTp1Filled) canli deger sadece
  // borsadan gelen bu emirlerde dogru.
  async getOpenOrders(symbol: string): Promise<{ orderId: number; price: number }[]> {
    const rows = await this.signedRequest<{ orderId: number; price: string }[]>('GET', '/fapi/v1/openOrders', { symbol });
    return rows.map((r) => ({ orderId: r.orderId, price: parseFloat(r.price) }));
  }

  // Bir LIMIT emrin (TP1/TP2/TP3) GERCEKTEN dolup dolmadigini kontrol etmek
  // icin - openOrders listesinden dusmus olmak FILLED anlamina gelmez, ayni
  // sekilde CANCELED/EXPIRED/REJECTED de listeden duser (bkz. kullanici geri
  // bildirimi 2026-08-21: APTUSDT'de basabas stop TP2/TP3'ten once tetiklenip
  // pozisyonu kapatinca, artik karsiligi olmayan TP2/TP3 reduceOnly emirleri
  // Binance tarafindan EXPIRED yapildi - ama panel "listede yok = doldu"
  // sandigi icin hic dolmayan bu emirleri de "alindi" gosterdi).
  async getOrderStatus(symbol: string, orderId: string | number): Promise<{ status: string } | null> {
    try {
      const row = await this.signedRequest<{ status: string }>('GET', '/fapi/v1/order', { symbol, orderId });
      return { status: row.status };
    } catch {
      return null;
    }
  }

  // Sonraki funding kesintisinin pozisyona +/- yansiyacagini kartta gostermek
  // icin (kullanici istegi 2026-08-20: "funding + mı - mi de göreyim") -
  // public bir endpoint, imza gerekmiyor.
  async getFundingRate(symbol: string): Promise<number | null> {
    const res = await fetch(`${this.restBase}/fapi/v1/premiumIndex?symbol=${symbol}`);
    const body = await res.json().catch(() => null);
    return body?.lastFundingRate != null ? parseFloat(body.lastFundingRate) : null;
  }

  // BTC referans kartinin fiyati icin - CryptoMovers'in ticker cache'i
  // dakikada bir yenilendigi (bkz. crypto-tools.service.ts refreshTicker,
  // '*/1 * * * *' cron) ve TTL 90sn oldugu icin fiyat donuk gorunuyordu
  // (kullanici geri bildirimi 2026-08-20: "btc fiyatı canlı değil mi hiç
  // oynamıyor") - bu, o cache'e hic dokunmayan, dogrudan/anlik bir sorgu.
  async getTickerPrice(symbol: string): Promise<number | null> {
    const res = await fetch(`${this.restBase}/fapi/v1/ticker/price?symbol=${symbol}`);
    const body = await res.json().catch(() => null);
    return body?.price != null ? parseFloat(body.price) : null;
  }

  // Money Maker'in en ustundeki BTC mum grafigi ve acik/bekleyen pozisyonlarin
  // BTC ile korelasyonu icin (kullanici istegi 2026-08-20: "mum çubukları
  // olsun, korelasyon bilgisi yazsın") - public kline endpoint'i, imza
  // gerekmiyor. Binance kline array formati: [openTime, open, high, low,
  // close, volume, ...].
  async getRecentKlines(
    symbol: string,
    interval = '1h',
    limit = 24,
  ): Promise<{ time: number; open: number; high: number; low: number; close: number }[]> {
    const res = await fetch(`${this.restBase}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    const rows = await res.json().catch(() => null);
    if (!Array.isArray(rows)) return [];
    return rows.map((r: any[]) => ({
      time: r[0],
      open: parseFloat(r[1]),
      high: parseFloat(r[2]),
      low: parseFloat(r[3]),
      close: parseFloat(r[4]),
    }));
  }

  private filtersCache = new Map<string, SymbolFilters>();
  async getSymbolFilters(symbol: string): Promise<SymbolFilters> {
    const cached = this.filtersCache.get(symbol);
    if (cached) return cached;
    const res = await fetch(`${this.restBase}/fapi/v1/exchangeInfo`);
    const data = await res.json();
    for (const s of data.symbols as any[]) {
      const lotSize = s.filters.find((f: any) => f.filterType === 'LOT_SIZE');
      const priceFilter = s.filters.find((f: any) => f.filterType === 'PRICE_FILTER');
      const minNotional = s.filters.find((f: any) => f.filterType === 'MIN_NOTIONAL');
      const filters: SymbolFilters = {
        stepSize: parseFloat(lotSize?.stepSize ?? '1'),
        tickSize: parseFloat(priceFilter?.tickSize ?? '0.01'),
        minQty: parseFloat(lotSize?.minQty ?? '0'),
        minNotional: parseFloat(minNotional?.notional ?? '5'),
      };
      this.filtersCache.set(s.symbol, filters);
    }
    const found = this.filtersCache.get(symbol);
    if (!found) throw new Error(`${symbol} icin exchangeInfo filtresi bulunamadi`);
    return found;
  }

  roundToStep(value: number, step: number): number {
    if (step <= 0) return value;
    const precision = Math.max(0, Math.round(-Math.log10(step)));
    // value/step icin IEEE754 kayan nokta hatasi (orn. 0.568/0.0001 =
    // 5679.999999999999) tam tick sinirindaki degerleri Math.floor ile bir
    // adim asagi yuvarlayabiliyordu - bkz. APTUSDT LONG girisinde entryZoneTop
    // 0.568 iken emir 0.5679'a acilmisti, scanner zaten 0.568 zone-top'unu
    // "TRIGGERED" saydigi halde borsadaki LIMIT emir bir tick daha dusuk fiyat
    // bekledigi icin dolmuyordu (kullanici geri bildirimi 2026-08-20).
    const steps = Math.floor(value / step + 1e-8);
    return parseFloat((steps * step).toFixed(precision));
  }

  // Binance 2025-12-09'da kosullu emirleri (STOP_MARKET/TAKE_PROFIT_MARKET/
  // STOP/TAKE_PROFIT/TRAILING_STOP_MARKET) ayri bir "Algo Order" servisine
  // tasidi - /fapi/v1/order artik bu tipleri -4120 ("Order type not supported
  // for this endpoint. Please use the Algo Order API endpoints instead")
  // ile reddediyor (bkz. kullanici geri bildirimi 2026-08-20: APTUSDT girisi
  // doldu ama stop emri acilamadi, pozisyon korumasiz kaldi). Bu yuzden bu
  // tipler otomatik olarak /fapi/v1/algoOrder'a yonlendiriliyor - cagiran kod
  // (auto-trade.service.ts) degismeden ayni {orderId, status} seklini alir
  // (algoId->orderId, algoStatus->status eslenir).
  private readonly ALGO_ORDER_TYPES = new Set(['STOP_MARKET', 'TAKE_PROFIT_MARKET']);

  async placeOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
    quantity?: number;
    price?: number;
    stopPrice?: number;
    reduceOnly?: boolean;
    timeInForce?: 'GTC';
  }): Promise<{ orderId: number; status: string; avgPrice?: string }> {
    if (this.ALGO_ORDER_TYPES.has(params.type)) {
      const body: Record<string, string | number> = {
        algoType: 'CONDITIONAL',
        symbol: params.symbol,
        side: params.side,
        type: params.type,
      };
      if (params.quantity != null) body.quantity = params.quantity;
      if (params.stopPrice != null) body.triggerPrice = params.stopPrice;
      if (params.reduceOnly) body.reduceOnly = 'true';
      const res = await this.signedRequest<{ algoId: number; algoStatus: string }>('POST', '/fapi/v1/algoOrder', body);
      return { orderId: res.algoId, status: res.algoStatus };
    }
    const body: Record<string, string | number> = {
      symbol: params.symbol,
      side: params.side,
      type: params.type,
    };
    if (params.quantity != null) body.quantity = params.quantity;
    if (params.price != null) {
      body.price = params.price;
      body.timeInForce = params.timeInForce ?? 'GTC';
    }
    if (params.stopPrice != null) body.stopPrice = params.stopPrice;
    if (params.reduceOnly) body.reduceOnly = 'true';
    return this.signedRequest('POST', '/fapi/v1/order', body);
  }

  async cancelOrder(symbol: string, orderId: string | number): Promise<void> {
    try {
      await this.signedRequest('DELETE', '/fapi/v1/order', { symbol, orderId });
    } catch (err: any) {
      // -2011 = emir zaten dolmus/iptal edilmis - hata sayilmaz, sessizce gec
      if (!String(err.message).includes('-2011')) {
        this.logger.warn(`cancelOrder basarisiz (${symbol}/${orderId}): ${err.message}`);
      }
    }
  }

  // Algo (kosullu) emirler /fapi/v1/order uzerinden iptal edilemiyor, ayri
  // endpoint gerekiyor - bkz. placeOrder yorumu. Sadece stop-loss emirleri
  // (STOP_MARKET) bu tipte, TP1/TP2/TP3 hala normal LIMIT.
  async cancelAlgoOrder(symbol: string, algoId: string | number): Promise<void> {
    try {
      await this.signedRequest('DELETE', '/fapi/v1/algoOrder', { symbol, algoId });
    } catch (err: any) {
      if (!String(err.message).includes('-2011')) {
        this.logger.warn(`cancelAlgoOrder basarisiz (${symbol}/${algoId}): ${err.message}`);
      }
    }
  }

  // SL (algo/STOP_MARKET) tetiklenip tetiklenmedigini kontrol etmek icin -
  // ORDER_TRADE_UPDATE websocket'i sadece normal emirler icin gelir, algo
  // emirlerinin kendi ALGO_UPDATE eventi belgelenmemis oldugundan (2026-08-20
  // itibariyle) guvenilir tetiklenme tespiti icin polling kullaniliyor (bkz.
  // AutoTradeService.pollPendingStopOrders).
  async getAlgoOrderStatus(
    symbol: string,
    algoId: string | number,
  ): Promise<{ algoStatus: string; actualOrderId: string; actualPrice: string; triggerPrice: string }> {
    return this.signedRequest('GET', '/fapi/v1/algoOrder', { symbol, algoId });
  }

  // Pozisyon tamamen kapandiktan sonra o sembol+zaman araligindaki GERCEK
  // kar/zarar KIRILIMINI (islem karı, komisyon, funding - ucuncusu Forex'te
  // yok ama kripto vadelide 8 saatte bir tahakkuk eder) cekmek icin -
  // AutoTradeService.onPositionClosed tarafindan cagrilir. incomeType filtresi
  // KONULMUYOR ki tum turler (REALIZED_PNL/COMMISSION/FUNDING_FEE) tek istekte
  // gelsin - bizim R-multiple tahminimiz DEGIL, Binance'in kendi muhasebesi
  // (kullanici istegi 2026-08-20: "funding ve fee de ekle, net kar... görelim
  // herşeyi").
  async getRealizedPnlBreakdown(
    symbol: string,
    startTime: number,
    endTime: number,
  ): Promise<{ realizedPnl: number; commission: number; funding: number; netTotal: number }> {
    // Giris komisyonu Binance'in income defterine, bizim entryFilledAt olarak
    // kaydettigimiz ORDER_TRADE_UPDATE zaman damgasindan (o.T) BIRKAC YUZ MS
    // ONCE dusuyor (trade gerceklesme ani ile emir guncelleme eventinin
    // yayilma zamani birebir ayni degil) - startTime tam entryFilledAt'a
    // esitse bu komisyon kaydi sorgunun disinda kalip "komisyon $0" gibi
    // yanlis gorunuyordu (bkz. kullanici geri bildirimi 2026-08-20: APTUSDT
    // giris ucreti hep sifir gozukuyordu, gercekte -$0.93 kesilmisti).
    const rows = await this.signedRequest<{ incomeType: string; income: string }[]>('GET', '/fapi/v1/income', {
      symbol,
      startTime: startTime - 5000,
      endTime: endTime + 5000,
      limit: 1000,
    });
    let realizedPnl = 0;
    let commission = 0;
    let funding = 0;
    for (const r of rows) {
      const amount = parseFloat(r.income);
      if (r.incomeType === 'REALIZED_PNL') realizedPnl += amount;
      else if (r.incomeType === 'COMMISSION') commission += amount;
      else if (r.incomeType === 'FUNDING_FEE') funding += amount;
    }
    return { realizedPnl, commission, funding, netTotal: realizedPnl + commission + funding };
  }

  // Genel (imzasiz) endpoint - API key olmadan da calisir. TerminalNewsTradeService
  // golge modda "su an piyasa fiyati ne" sormak icin kullanir (henuz pozisyon
  // yok, getPositionRisk bos doner).
  async getLastPrice(symbol: string): Promise<number> {
    const res = await fetch(`${this.restBase}/fapi/v1/ticker/price?symbol=${symbol}`);
    const body = await res.json();
    return parseFloat(body.price);
  }

  // Haber-oncesi pivot (swing high/low) hesaplamak icin gecmis mum verisi -
  // TerminalNewsTradeService.computePivotStop tarafindan kullanilir. Genel
  // (imzasiz) endpoint.
  async getRecentCandles(
    symbol: string,
    endTime: number,
    limit = 30,
    interval = '1m',
  ): Promise<{ openTime: number; high: number; low: number; close: number }[]> {
    const res = await fetch(
      `${this.restBase}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&endTime=${endTime}&limit=${limit}`,
    );
    const rows: any[] = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({ openTime: r[0], high: parseFloat(r[2]), low: parseFloat(r[3]), close: parseFloat(r[4]) }));
  }

  async createListenKey(): Promise<string> {
    const res = await fetch(`${this.restBase}/fapi/v1/listenKey`, {
      method: 'POST',
      headers: { 'X-MBX-APIKEY': this.apiKey },
    });
    const body = await res.json();
    return body.listenKey;
  }

  async keepAliveListenKey(): Promise<void> {
    await fetch(`${this.restBase}/fapi/v1/listenKey`, {
      method: 'PUT',
      headers: { 'X-MBX-APIKEY': this.apiKey },
    });
  }
}
