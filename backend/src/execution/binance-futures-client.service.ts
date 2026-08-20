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
  private maxLeverageCache = new Map<string, number>();
  async getMaxLeverage(symbol: string): Promise<number> {
    const cached = this.maxLeverageCache.get(symbol);
    if (cached) return cached;
    const rows = await this.signedRequest<{ symbol: string; brackets: { initialLeverage: number }[] }[]>(
      'GET',
      '/fapi/v1/leverageBracket',
      { symbol },
    );
    const maxLev = rows[0]?.brackets?.[0]?.initialLeverage ?? 20;
    this.maxLeverageCache.set(symbol, maxLev);
    return maxLev;
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
    return parseFloat((Math.floor(value / step) * step).toFixed(precision));
  }

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
    const rows = await this.signedRequest<{ incomeType: string; income: string }[]>('GET', '/fapi/v1/income', {
      symbol,
      startTime,
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
