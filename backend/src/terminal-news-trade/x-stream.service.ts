import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

export interface XNewsEvent {
  sourceUrl: string;
  sourceAccount: string;
  rawText: string;
  publishedAt: Date;
}

// Izlenen resmi/dogrulanmis hesaplar - X API filtered stream kuralini olusturur.
// Kategori Filtresi (2026-08-20 arastirmasi) "dogrulanmamis/anonim kaynak =
// kacin" dedigi icin bilerek SADECE resmi hesap/kurumsal haber ajansi listesi
// (rumor/anonim hesap YOK). Yeni hesap eklemek/cikarmak icin sadece bu listeyi
// duzenlemek yeterli - kod tarafinda baska bir yer degismez.
export const WATCHED_ACCOUNTS = [
  'binance', 'cz_binance', 'coinbase', 'krakenfx', // borsalar - hack/iflas duyurulari icin
  'SECGov', 'federalreserve', // resmi kurumlar - regulasyon/makro
  'business', 'Reuters', 'WSJ', // haber ajanslari - M&A dogrulamasi icin
  'elonmusk', // dogrulanmis etkili kisi ornegi
];

// X API v2 "filtered stream" istemcisi. Kullanici Faz 1'de gercek X API
// erisimi (en az Basic tier) aldiginda X_API_BEARER_TOKEN env degiskenini
// ayarlamasi yeterli - kod baska bir degisiklik gerektirmeden aktif olur
// (BinanceFuturesClientService.isConfigured deseniyle birebir ayni: API key
// yoksa servis sessizce pasif kalir, hicbir yerde crash olmaz).
@Injectable()
export class XStreamService implements OnModuleInit {
  private readonly logger = new Logger(XStreamService.name);
  private readonly bearerToken = process.env.X_API_BEARER_TOKEN || '';
  private readonly base = 'https://api.twitter.com/2';
  private listeners: ((event: XNewsEvent) => void)[] = [];
  private reconnectDelayMs = 1000;

  get isConfigured(): boolean {
    return !!this.bearerToken;
  }

  onNews(listener: (event: XNewsEvent) => void) {
    this.listeners.push(listener);
  }

  async onModuleInit() {
    if (!this.isConfigured) {
      this.logger.warn(
        'X_API_BEARER_TOKEN tanimli degil - Terminal News Trade haber akisi PASIF (X API erisimi alinip .env ayarlanana kadar).',
      );
      return;
    }
    await this.syncRules();
    this.connect();
  }

  private authHeaders() {
    return { Authorization: `Bearer ${this.bearerToken}` };
  }

  // X API'de aktif kural seti stream'i belirler - once mevcut kurallari silip
  // WATCHED_ACCOUNTS listesinden tek bir kural olusturuyoruz (basitlik icin;
  // kategori bazli ayri kurallar ileride eklenebilir, siniflandirma zaten
  // Claude tarafinda yapiliyor).
  private async syncRules() {
    try {
      const existing = await fetch(`${this.base}/tweets/search/stream/rules`, { headers: this.authHeaders() }).then(
        (r) => r.json(),
      );
      const ids = (existing?.data ?? []).map((r: any) => r.id);
      if (ids.length > 0) {
        await fetch(`${this.base}/tweets/search/stream/rules`, {
          method: 'POST',
          headers: { ...this.authHeaders(), 'content-type': 'application/json' },
          body: JSON.stringify({ delete: { ids } }),
        });
      }
      const value = WATCHED_ACCOUNTS.map((u) => `from:${u}`).join(' OR ');
      await fetch(`${this.base}/tweets/search/stream/rules`, {
        method: 'POST',
        headers: { ...this.authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({ add: [{ value, tag: 'terminal-news-trade-watchlist' }] }),
      });
    } catch (err: any) {
      this.logger.error(`X stream kural senkronizasyonu basarisiz: ${err.message}`);
    }
  }

  // Kalici baglanti - X'in stream'i bir HTTP response body'sini acik tutup
  // her tweet'i ayri bir JSON satiri olarak gonderir (chunked). Baglanti
  // koparsa (ag hatasi, X tarafi resetleme) ustel geri cekilmeyle (max 60sn)
  // otomatik yeniden baglanir - kullanici uykudayken/ekrandan uzakken de
  // haber akisi kesintisiz sursun diye.
  private async connect() {
    try {
      const res = await fetch(
        `${this.base}/tweets/search/stream?tweet.fields=created_at&expansions=author_id&user.fields=username`,
        { headers: this.authHeaders() },
      );
      if (!res.ok || !res.body) throw new Error(`stream baglantisi basarisiz: ${res.status}`);
      this.reconnectDelayMs = 1000;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue; // X stream'de bos satirlar keep-alive amacli
          this.handleLine(line);
        }
      }
      throw new Error('stream beklenmedik sekilde kapandi');
    } catch (err: any) {
      this.logger.warn(`X stream baglantisi koptu (${err.message}), ${this.reconnectDelayMs}ms sonra tekrar denenecek`);
      setTimeout(() => this.connect(), this.reconnectDelayMs);
      this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 60000);
    }
  }

  private handleLine(line: string) {
    try {
      const parsed = JSON.parse(line);
      const tweet = parsed?.data;
      const author = parsed?.includes?.users?.find((u: any) => u.id === tweet?.author_id);
      if (!tweet || !author) return;
      const event: XNewsEvent = {
        sourceUrl: `https://x.com/${author.username}/status/${tweet.id}`,
        sourceAccount: author.username,
        rawText: tweet.text,
        publishedAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
      };
      for (const listener of this.listeners) listener(event);
    } catch {
      // JSON olmayan satir (X'in periyodik keep-alive'i olabilir) - sessizce gec
    }
  }
}
