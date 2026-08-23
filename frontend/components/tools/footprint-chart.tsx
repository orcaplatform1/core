"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { FootprintCandle, HeatmapResponse } from "@/lib/types/tools";

// Baloncuk duvarıyla aynı koyu lacivert dil — iki grafik dikey olarak tek akış
// gibi hissettirsin diye renk paleti bilinçli olarak birebir aynı tutuluyor.
const BG_TOP = "#11142A";
const BG_BOTTOM = "#0A0C1B";
const BUY = { mid: "34, 197, 94", dark: "21, 128, 61", light: "187, 247, 208" };
const SELL = { mid: "239, 68, 68", dark: "185, 28, 28", light: "254, 202, 202" };

// Quantower/Bookmap referansındaki iki sütunlu hücre düzeni: satır başına sol=agresif
// satış, sağ=agresif alım hacmi rakam olarak yazılıyor; o mumun en yoğun (baskın)
// hücreleri dolu renkli "chip" ile belirginleştiriliyor, geri kalanı sade metin.
const DOMINANCE_RATIO = 0.55;
const MIN_CANDLE_W = 92;
const AXIS_WIDTH = 68;

function fmtCell(n: number) {
  if (n <= 0) return "0";
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function fmtCompact(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(1)}`;
}

function fmtAxisPrice(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export function FootprintChart({
  data,
  height = 460,
}: {
  data: HeatmapResponse | undefined;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // null = canlı takip (her zaman en son mumu göster). Doluysa: pencerenin sağ
  // ucundaki mumun "time" değeri — geçmişe gidince yeni mumlar gelse de görünüm
  // kaymasın diye zamana göre sabitliyoruz (index'e göre değil, buffer kayınca
  // index'ler oynar).
  const [anchorTime, setAnchorTime] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const visibleCountRef = useRef(1);
  const dragRef = useRef<{ pointerId: number; startX: number; startEndIdx: number } | null>(null);

  function resolveEndIdx(all: FootprintCandle[]): number {
    if (all.length === 0) return 0;
    const anchorIdx = anchorTime ? all.findIndex((c) => c.time === anchorTime) : -1;
    return anchorIdx === -1 ? all.length : anchorIdx + 1;
  }

  // Grafiği fare/parmakla sürükleyip geçmişe kaydırma — sağa sürüklemek daha eski
  // mumları, sola sürüklemek en son muma doğru geri gelmeyi gösterir (chart
  // platformlarındaki standart "grab & pan" davranışı).
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const all = data?.footprint ?? [];
    if (all.length === 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startEndIdx: resolveEndIdx(all) };
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const container = containerRef.current;
    const all = data?.footprint ?? [];
    if (!drag || !container || all.length === 0) return;
    const plotWidth = container.clientWidth - AXIS_WIDTH;
    const visibleCount = Math.max(1, visibleCountRef.current);
    const candleW = plotWidth / visibleCount;
    const deltaCandles = Math.round((e.clientX - drag.startX) / candleW);
    let newEndIdx = drag.startEndIdx - deltaCandles;
    newEndIdx = Math.max(visibleCount, Math.min(all.length, newEndIdx));
    setAnchorTime(newEndIdx >= all.length ? null : all[newEndIdx - 1].time);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(dragRef.current.pointerId);
      } catch {
        // ignore
      }
    }
    dragRef.current = null;
    setIsDragging(false);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    function draw() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const width = container.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, BG_TOP);
      bg.addColorStop(1, BG_BOTTOM);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const all = data?.footprint ?? [];
      const bucketSize = data?.bucketSize ?? 0;
      if (!data || !data.ready || all.length === 0 || bucketSize <= 0) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Footprint mumları toplanıyor...", width / 2, height / 2);
        return;
      }

      const plotWidth = width - AXIS_WIDTH;

      // Konteynere sığan kadar mum göster (her mumun iki sütunlu rakam ızgarası
      // okunabilir kalsın diye minimum genişlik garantili). anchorTime doluysa o
      // mum pencerenin sağ ucuna sabitlenir (geçmişe kaydırma), boşsa en yeni mum
      // sağda durur (canlı takip).
      const visibleCount = Math.max(1, Math.min(all.length, Math.floor(plotWidth / MIN_CANDLE_W)));
      visibleCountRef.current = visibleCount;
      const anchorIdx = anchorTime ? all.findIndex((c) => c.time === anchorTime) : -1;
      const endIdx = anchorIdx === -1 ? all.length : anchorIdx + 1;
      const startIdx = Math.max(0, endIdx - visibleCount);
      const candles = all.slice(startIdx, endIdx);

      const candleW = plotWidth / candles.length;

      // Fiyat eksenini indeks (bucket adedi) üzerinden hizalıyoruz — float
      // yuvarlama farkları yüzünden satırların mumlar arasında kayması engellenir.
      const idxOf = (price: number) => Math.round(price / bucketSize);
      let globalMinIdx = Infinity;
      let globalMaxIdx = -Infinity;
      for (const c of candles) {
        globalMinIdx = Math.min(globalMinIdx, idxOf(c.low));
        globalMaxIdx = Math.max(globalMaxIdx, idxOf(c.high));
      }
      const TOP_PAD = 2;
      const BOTTOM_PAD = 2;
      const totalRows = globalMaxIdx - globalMinIdx + 1 + TOP_PAD + BOTTOM_PAD;
      const rowH = height / totalRows;
      const idxToY = (idx: number) => height - (idx - globalMinIdx + BOTTOM_PAD + 0.5) * rowH;

      const numFont = `${Math.min(10, Math.max(7, rowH - 3)).toFixed(0)}px ui-monospace, monospace`;
      const numFontBold = `bold ${Math.min(10, Math.max(7, rowH - 3)).toFixed(0)}px ui-monospace, monospace`;
      const bodyThickness = Math.max(3, Math.min(candleW * 0.07, 6));

      candles.forEach((candle: FootprintCandle, ci: number) => {
        const centerX = ci * candleW + candleW / 2;
        const isUp = candle.close >= candle.open;
        const dirColor = isUp ? BUY.mid : SELL.mid;
        const dirDark = isUp ? BUY.dark : SELL.dark;
        const highIdx = idxOf(candle.high);
        const lowIdx = idxOf(candle.low);

        const yTop = idxToY(highIdx) - rowH / 2;
        const yBottom = idxToY(lowIdx) + rowH / 2;

        // Gerçek mum gibi: gövde (açılış-kapanış arası, kalın dolgu) + fitil
        // (gövdenin üstünde/altında kalan high-low kısmı, ince çizgi).
        const yOpen = idxToY(idxOf(candle.open));
        const yClose = idxToY(idxOf(candle.close));
        const bodyTop = Math.min(yOpen, yClose);
        const bodyBottom = Math.max(yOpen, yClose);

        ctx.strokeStyle = `rgba(${dirColor}, ${candle.closed ? 0.6 : 0.95})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(centerX, yTop);
        ctx.lineTo(centerX, bodyTop);
        ctx.moveTo(centerX, bodyBottom);
        ctx.lineTo(centerX, yBottom);
        ctx.stroke();

        ctx.fillStyle = `rgba(${dirColor}, ${candle.closed ? 0.55 : 0.85})`;
        ctx.fillRect(centerX - bodyThickness / 2, bodyTop, bodyThickness, Math.max(bodyBottom - bodyTop, 2));
        ctx.strokeStyle = `rgba(${dirDark}, 0.9)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(centerX - bodyThickness / 2, bodyTop, bodyThickness, Math.max(bodyBottom - bodyTop, 2));

        const levelByIdx = new Map<number, { buyVol: number; sellVol: number }>();
        for (const l of candle.levels) levelByIdx.set(idxOf(l.price), l);
        const maxCellVal = Math.max(
          ...candle.levels.map((l) => Math.max(l.buyVol, l.sellVol)),
          1e-9,
        );
        const threshold = maxCellVal * DOMINANCE_RATIO;

        ctx.font = numFont;
        ctx.textBaseline = "middle";
        for (let idx = highIdx; idx >= lowIdx; idx--) {
          const level = levelByIdx.get(idx);
          const buy = level?.buyVol ?? 0;
          const sell = level?.sellVol ?? 0;
          const y = idxToY(idx);
          const rowTop = y - rowH / 2;

          const sellHot = sell >= threshold && sell > 0;
          const buyHot = buy >= threshold && buy > 0;

          // Sol sütun: agresif satış
          const sellText = fmtCell(sell);
          const sellColX = centerX - 5;
          if (sellHot) {
            const chipW = ctx.measureText(sellText).width + 8;
            ctx.fillStyle = `rgba(${SELL.mid}, 0.9)`;
            ctx.fillRect(sellColX - chipW, rowTop + 0.5, chipW, Math.max(rowH - 1, 2));
            ctx.fillStyle = "#fff";
            ctx.font = numFontBold;
          } else {
            ctx.fillStyle = `rgba(${SELL.light}, 0.75)`;
            ctx.font = numFont;
          }
          ctx.textAlign = "right";
          ctx.fillText(sellText, sellColX, y);

          // Sağ sütun: agresif alım
          const buyText = fmtCell(buy);
          const buyColX = centerX + 5;
          if (buyHot) {
            const chipW = ctx.measureText(buyText).width + 8;
            ctx.fillStyle = `rgba(${BUY.mid}, 0.9)`;
            ctx.fillRect(buyColX, rowTop + 0.5, chipW, Math.max(rowH - 1, 2));
            ctx.fillStyle = "#fff";
            ctx.font = numFontBold;
          } else {
            ctx.fillStyle = `rgba(${BUY.light}, 0.75)`;
            ctx.font = numFont;
          }
          ctx.textAlign = "left";
          ctx.fillText(buyText, buyColX, y);
        }

        // Üstte özet: toplam hacim + net delta.
        const totalVol = candle.totalBuyVol + candle.totalSellVol;
        const delta = candle.totalBuyVol - candle.totalSellVol;
        ctx.textAlign = "center";
        ctx.font = "9px ui-monospace, monospace";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText(`V ${fmtCompact(totalVol)}`, centerX, yTop - rowH * 0.9);
        ctx.fillStyle = delta >= 0 ? `rgba(${BUY.light}, 0.95)` : `rgba(${SELL.light}, 0.95)`;
        ctx.fillText(`${delta >= 0 ? "+" : ""}${fmtCompact(delta)}`, centerX, yTop - rowH * 0.1);

        // Altta özet: al/sat oranı.
        const ratio = candle.totalSellVol > 0 ? candle.totalBuyVol / candle.totalSellVol : candle.totalBuyVol > 0 ? Infinity : 1;
        const ratioLabel = Number.isFinite(ratio) ? ratio.toFixed(2) : "∞";
        ctx.fillStyle = ratio >= 1 ? `rgba(${BUY.light}, 0.85)` : `rgba(${SELL.light}, 0.85)`;
        ctx.font = "9px ui-monospace, monospace";
        ctx.fillText(`B/S ${ratioLabel}`, centerX, yBottom + rowH * 0.7);

        // Zaman etiketi.
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillText(fmtTime(candle.time), centerX, height - 6);
      });

      // Fiyat ekseni (sağda).
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const labelCount = 6;
      for (let i = 0; i <= labelCount; i++) {
        const idx = globalMinIdx + ((globalMaxIdx - globalMinIdx) * i) / labelCount;
        const y = idxToY(idx);
        ctx.fillText(fmtAxisPrice(idx * bucketSize), plotWidth + 6, y);
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(plotWidth, y);
        ctx.stroke();
      }
    }

    draw();
    const resizeObserver = new ResizeObserver(() => draw());
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [data, height, anchorTime]);

  const isLive = anchorTime == null;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-body-xs text-muted-foreground">
        <span>Footprint — mum başına satış|alım hacmi ({Math.round((data?.footprintIntervalMs ?? 60000) / 60000)}dk)</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm bg-success/80" /> Agresif alım
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm bg-danger/80" /> Agresif satım
          </span>
          {!isLive && (
            <button
              type="button"
              onClick={() => setAnchorTime(null)}
              className="flex items-center gap-1 rounded-md border border-purple/25 px-1.5 py-0.5 text-purple transition-colors hover:bg-card-hover"
              title="Canlıya dön"
            >
              <RotateCcw className="size-3" /> Canlı
            </button>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-full touch-none select-none overflow-hidden rounded-xl border border-purple/20 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
