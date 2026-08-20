import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import WebSocket from 'ws';
import { BinanceFuturesClientService } from './binance-futures-client.service';

export interface OrderFillEvent {
  symbol: string;
  orderId: number;
  status: 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELED' | 'EXPIRED' | 'NEW' | 'REJECTED';
  side: 'BUY' | 'SELL';
  avgPrice: number;
  filledQty: number;
}

// Binance'in "User Data Stream" websocket'i - emir doldugu ANDA (saniyeler
// icinde) ORDER_TRADE_UPDATE eventi gonderir. AutoTradeService bu eventleri
// dinleyerek TP1 dolunca stop'u anlik olarak basabasa cekiyor - fiyati kendi
// tarafimizda pollamiyoruz, borsanin kendi fill bildirimini kullaniyoruz
// (kullanici istegi 2026-08-20: "taramalar anlık olsun, stop entry'e kadar
// kendi çeksin" - bunun dogru/guvenilir yolu bu, mum-polling degil).
@Injectable()
export class BinanceUserStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BinanceUserStreamService.name);
  private ws: WebSocket | null = null;
  private listenKey: string | null = null;
  private keepAliveTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private listeners: ((event: OrderFillEvent) => void)[] = [];
  private stopped = false;

  constructor(private readonly binance: BinanceFuturesClientService) {}

  onOrderUpdate(handler: (event: OrderFillEvent) => void) {
    this.listeners.push(handler);
  }

  async onModuleInit() {
    if (!this.binance.isConfigured) {
      this.logger.log('BINANCE_API_KEY/SECRET tanimli degil - otomatik islem devre disi (sadece manuel/simule tarama calisir).');
      return;
    }
    await this.connect();
  }

  onModuleDestroy() {
    this.stopped = true;
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }

  private async connect() {
    try {
      this.listenKey = await this.binance.createListenKey();
      const ws = new WebSocket(`${this.binance.wsBase}/ws/${this.listenKey}`);
      this.ws = ws;

      ws.on('open', () => {
        this.logger.log(`Binance user-data-stream bagli (${this.binance.testnet ? 'TESTNET' : 'LIVE'})`);
      });

      ws.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.e === 'ORDER_TRADE_UPDATE') {
            const o = msg.o;
            const event: OrderFillEvent = {
              symbol: o.s,
              orderId: o.i,
              status: o.X,
              side: o.S,
              avgPrice: parseFloat(o.ap || '0'),
              filledQty: parseFloat(o.z || '0'),
            };
            for (const listener of this.listeners) listener(event);
          }
        } catch (err: any) {
          this.logger.warn(`user-stream mesaj parse hatasi: ${err.message}`);
        }
      });

      ws.on('close', () => {
        if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
        if (!this.stopped) {
          this.logger.warn('user-data-stream baglantisi koptu, 5sn sonra yeniden baglaniliyor');
          this.reconnectTimer = setTimeout(() => this.connect(), 5000);
        }
      });

      ws.on('error', (err) => {
        this.logger.error(`user-data-stream ws hatasi: ${err.message}`);
      });

      // Binance listenKey'i 60dk'da bir yenilenmezse otomatik kapatiyor -
      // 30dk'da bir keepalive gonderiliyor (Binance dokumantasyonundaki
      // onerilen aralik).
      this.keepAliveTimer = setInterval(() => {
        this.binance.keepAliveListenKey().catch((err) => this.logger.warn(`listenKey keepalive hatasi: ${err.message}`));
      }, 30 * 60 * 1000);
    } catch (err: any) {
      this.logger.error(`user-data-stream baglanti hatasi: ${err.message}, 10sn sonra tekrar denenecek`);
      if (!this.stopped) {
        this.reconnectTimer = setTimeout(() => this.connect(), 10000);
      }
    }
  }
}
