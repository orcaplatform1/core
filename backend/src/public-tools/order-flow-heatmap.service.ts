import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import WebSocket from 'ws';

const WS_BASE = 'wss://fstream.binance.com';
const REST_BASE = 'https://fapi.binance.com';
const SNAPSHOT_INTERVAL_MS = 1000;
const MAX_ROWS = 300; // 1sn çözünürlükte 5 dakikalık kayan pencere
const IDLE_TIMEOUT_MS = 60_000;
const SWEEP_INTERVAL_MS = 15_000;
const VISIBLE_RANGE_PERCENT = 0.015;
const DESIRED_BUCKET_COUNT = 80;

type HeatmapRow = { time: number; bid: Map<number, number>; ask: Map<number, number>; midPrice: number };

interface HeatmapSession {
  symbol: string;
  ws: WebSocket | null;
  bids: Map<number, number>;
  asks: Map<number, number>;
  lastUpdateId: number;
  lastAppliedU: number;
  buffer: any[];
  pendingSnapshot: any | null;
  synced: boolean;
  bucketSize: number;
  snapshotTimer: NodeJS.Timeout | null;
  reconnectTimer: NodeJS.Timeout | null;
  lastRequestedAt: number;
  rows: HeatmapRow[];
}

export type HeatmapResponse = {
  symbol: string;
  ready: boolean;
  bucketSize: number;
  priceLevels: number[];
  rows: { time: string; bid: number[]; ask: number[]; midPrice: number }[];
  midPrice: number | null;
  updatedAt: string;
};

// Bookmap tarzı "kayan zaman duvarı" — Binance Futures'ın diff-depth websocket'ini
// resmi senkronizasyon akışıyla (REST snapshot + buffered event replay + pu zinciri
// kontrolü) yerel bir order book'a uygulayıp saniyede bir fiyat-bucket'lı satır
// (heatmap row) biriktiriyoruz. Sadece o an istek gelen sembol için akış açılır,
// ~60sn kimse bakmazsa otomatik kapanır (kullanıcı isteği: "bakarken toplansın,
// geçmiş veri incelemeye gerek yok" - CPU'ya sabit bir yük binmesin).
@Injectable()
export class OrderFlowHeatmapService implements OnModuleDestroy {
  private readonly logger = new Logger(OrderFlowHeatmapService.name);
  private readonly sessions = new Map<string, HeatmapSession>();
  private readonly sweepTimer: NodeJS.Timeout;

  constructor() {
    this.sweepTimer = setInterval(() => this.sweepIdleSessions(), SWEEP_INTERVAL_MS);
  }

  onModuleDestroy() {
    clearInterval(this.sweepTimer);
    for (const session of this.sessions.values()) this.stopSession(session);
  }

  async getHeatmap(symbol: string): Promise<HeatmapResponse> {
    let session = this.sessions.get(symbol);
    if (!session) {
      session = this.createSession(symbol);
      this.sessions.set(symbol, session);
      this.connectStream(session);
      this.logger.log(`[heatmap] ${symbol} icin canli akis baslatildi`);
    }
    session.lastRequestedAt = Date.now();
    return this.formatHeatmap(session);
  }

  private createSession(symbol: string): HeatmapSession {
    return {
      symbol,
      ws: null,
      bids: new Map(),
      asks: new Map(),
      lastUpdateId: 0,
      lastAppliedU: 0,
      buffer: [],
      pendingSnapshot: null,
      synced: false,
      bucketSize: 0,
      snapshotTimer: null,
      reconnectTimer: null,
      lastRequestedAt: Date.now(),
      rows: [],
    };
  }

  private connectStream(session: HeatmapSession) {
    const streamSymbol = session.symbol.toLowerCase();
    const ws = new WebSocket(`${WS_BASE}/ws/${streamSymbol}@depth@100ms`);
    session.ws = ws;
    session.buffer = [];
    session.synced = false;

    ws.on('open', () => {
      this.initSnapshot(session).catch((err) => {
        this.logger.warn(`[heatmap] ${session.symbol} snapshot hatasi: ${err}`);
      });
    });

    ws.on('message', (raw: Buffer) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!session.synced) {
        session.buffer.push(msg);
        if (session.buffer.length > 5000) session.buffer.splice(0, session.buffer.length - 5000);
        if (session.pendingSnapshot) this.tryFinishSync(session);
        return;
      }
      if (msg.pu !== session.lastAppliedU) {
        this.logger.warn(`[heatmap] ${session.symbol} akis kopuklugu tespit edildi, yeniden senkronize ediliyor`);
        session.synced = false;
        session.pendingSnapshot = null;
        session.buffer = [msg];
        this.initSnapshot(session).catch((err) => {
          this.logger.warn(`[heatmap] ${session.symbol} resync hatasi: ${err}`);
        });
        return;
      }
      this.applyDiff(session, msg);
      session.lastAppliedU = msg.u;
    });

    ws.on('close', () => {
      if (this.sessions.get(session.symbol) === session) {
        session.reconnectTimer = setTimeout(() => this.connectStream(session), 3000);
      }
    });

    ws.on('error', (err: Error) => {
      this.logger.warn(`[heatmap] ${session.symbol} ws hatasi: ${err.message}`);
    });
  }

  private async initSnapshot(session: HeatmapSession): Promise<void> {
    const res = await fetch(`${REST_BASE}/fapi/v1/depth?symbol=${session.symbol}&limit=1000`);
    if (!res.ok) throw new Error(`depth snapshot ${res.status}`);
    session.pendingSnapshot = await res.json();
    this.tryFinishSync(session);
  }

  // Binance'in resmi senkron akışı: REST snapshot alındığı anda tamponda henüz
  // snapshot'ı "saran" (straddle) bir event olmayabilir (REST round-trip'i sırasında
  // stream ilerlemeye devam eder) — bu durumda hemen "synced" işaretlemek yerine
  // yeni event'ler tampona düştükçe tekrar deneriz, straddle bulununca replay ederiz.
  private tryFinishSync(session: HeatmapSession) {
    const snap = session.pendingSnapshot;
    if (!snap) return;
    const lastUpdateId = snap.lastUpdateId;
    const buffer = session.buffer;

    const straddleIdx = buffer.findIndex((e) => e.U <= lastUpdateId + 1 && e.u >= lastUpdateId + 1);
    if (straddleIdx === -1) return; // henüz yeterli event birikmedi, sıradaki mesajda tekrar denenecek

    session.bids = new Map(snap.bids.map(([p, q]: [string, string]) => [parseFloat(p), parseFloat(q)]));
    session.asks = new Map(snap.asks.map(([p, q]: [string, string]) => [parseFloat(p), parseFloat(q)]));
    session.lastUpdateId = lastUpdateId;
    session.lastAppliedU = lastUpdateId;
    if (!session.bucketSize) {
      session.bucketSize = this.computeBucketSize(session);
    }

    let gapDetected = false;
    for (let i = straddleIdx; i < buffer.length; i++) {
      const e = buffer[i];
      if (i > straddleIdx && e.pu !== session.lastAppliedU) {
        gapDetected = true;
        break;
      }
      this.applyDiff(session, e);
      session.lastAppliedU = e.u;
    }

    session.buffer = [];
    session.pendingSnapshot = null;

    if (gapDetected) {
      this.logger.warn(`[heatmap] ${session.symbol} tampon icinde kopukluk, tekrar senkronize ediliyor`);
      this.initSnapshot(session).catch((err) => {
        this.logger.warn(`[heatmap] ${session.symbol} resync hatasi: ${err}`);
      });
      return;
    }

    session.synced = true;
    if (!session.snapshotTimer) {
      session.snapshotTimer = setInterval(() => this.captureRow(session), SNAPSHOT_INTERVAL_MS);
    }
  }

  private bucketOf(session: HeatmapSession, price: number): number {
    if (!session.bucketSize) return price;
    return Number((Math.round(price / session.bucketSize) * session.bucketSize).toPrecision(10));
  }

  private applyDiff(session: HeatmapSession, e: any) {
    for (const [p, q] of e.b ?? []) {
      const price = parseFloat(p);
      const qty = parseFloat(q);
      if (qty === 0) session.bids.delete(price);
      else session.bids.set(price, qty);
    }
    for (const [p, q] of e.a ?? []) {
      const price = parseFloat(p);
      const qty = parseFloat(q);
      if (qty === 0) session.asks.delete(price);
      else session.asks.set(price, qty);
    }
  }

  private computeBucketSize(session: HeatmapSession): number {
    const sortedPrices = [...session.bids.keys(), ...session.asks.keys()].sort((a, b) => a - b);
    let tick = Infinity;
    for (let i = 1; i < sortedPrices.length; i++) {
      const diff = sortedPrices[i] - sortedPrices[i - 1];
      if (diff > 0 && diff < tick) tick = diff;
    }
    if (!Number.isFinite(tick) || tick <= 0) tick = 1;

    const bestBid = Math.max(...session.bids.keys());
    const bestAsk = Math.min(...session.asks.keys());
    const midPrice = (bestBid + bestAsk) / 2;
    const desiredRange = midPrice * VISIBLE_RANGE_PERCENT * 2;
    const rawBucket = desiredRange / DESIRED_BUCKET_COUNT;
    const bucket = Math.max(tick, Math.round(rawBucket / tick) * tick);
    return Number(bucket.toPrecision(8));
  }

  private captureRow(session: HeatmapSession) {
    if (!session.synced || session.bids.size === 0 || session.asks.size === 0) return;

    const bestBid = Math.max(...session.bids.keys());
    const bestAsk = Math.min(...session.asks.keys());
    const midPrice = (bestBid + bestAsk) / 2;
    const halfRange = midPrice * VISIBLE_RANGE_PERCENT;
    const lo = midPrice - halfRange;
    const hi = midPrice + halfRange;
    const bucketOf = (p: number) => this.bucketOf(session, p);

    const bidRow = new Map<number, number>();
    for (const [p, q] of session.bids) {
      if (p < lo || p > hi) continue;
      const b = bucketOf(p);
      bidRow.set(b, (bidRow.get(b) ?? 0) + q);
    }
    const askRow = new Map<number, number>();
    for (const [p, q] of session.asks) {
      if (p < lo || p > hi) continue;
      const b = bucketOf(p);
      askRow.set(b, (askRow.get(b) ?? 0) + q);
    }

    session.rows.push({ time: Date.now(), bid: bidRow, ask: askRow, midPrice });
    if (session.rows.length > MAX_ROWS) session.rows.shift();
  }

  private formatHeatmap(session: HeatmapSession): HeatmapResponse {
    if (!session.synced || session.rows.length === 0) {
      return {
        symbol: session.symbol,
        ready: false,
        bucketSize: session.bucketSize,
        priceLevels: [],
        rows: [],
        midPrice: null,
        updatedAt: new Date().toISOString(),
      };
    }

    const levelSet = new Set<number>();
    for (const row of session.rows) {
      for (const p of row.bid.keys()) levelSet.add(p);
      for (const p of row.ask.keys()) levelSet.add(p);
    }
    const priceLevels = Array.from(levelSet).sort((a, b) => a - b);

    const rows = session.rows.map((row) => ({
      time: new Date(row.time).toISOString(),
      bid: priceLevels.map((p) => row.bid.get(p) ?? 0),
      ask: priceLevels.map((p) => row.ask.get(p) ?? 0),
      midPrice: row.midPrice,
    }));

    return {
      symbol: session.symbol,
      ready: true,
      bucketSize: session.bucketSize,
      priceLevels,
      rows,
      midPrice: rows[rows.length - 1]?.midPrice ?? null,
      updatedAt: new Date().toISOString(),
    };
  }

  private stopSession(session: HeatmapSession) {
    if (session.snapshotTimer) clearInterval(session.snapshotTimer);
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
    try {
      session.ws?.removeAllListeners();
      session.ws?.close();
    } catch {
      // ignore
    }
    this.sessions.delete(session.symbol);
  }

  private sweepIdleSessions() {
    const now = Date.now();
    for (const session of [...this.sessions.values()]) {
      if (now - session.lastRequestedAt > IDLE_TIMEOUT_MS) {
        this.logger.log(`[heatmap] ${session.symbol} izleyici kalmadi, akis kapatiliyor`);
        this.stopSession(session);
      }
    }
  }
}
