"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { HeatmapResponse, LargeTrade } from "@/lib/types/tools";

// Bookmap referans paletindeki tek ısı gradyanı (soğuk->sıcak): koyu lacivert ->
// mavi -> camgöbeği -> sarı -> turuncu -> kırmızı. Taraf (bid/ask) değil, o andaki
// duran hacmin BÜYÜKLÜĞÜ rengi belirliyor — az miktar arka planla neredeyse
// bütünleşik lacivert, çok miktar kırmızı. Ortadaki "beyaz" durak bilinçli olarak
// çıkarıldı — göz alıcı bir parlama yaratıp ekranı gürültülü gösteriyordu
// (kullanıcı geri bildirimi: "çok renkli çok gürültülü").
const HEAT_STOPS: { t: number; rgb: [number, number, number] }[] = [
  { t: 0.0, rgb: [10, 30, 68] },
  { t: 0.32, rgb: [22, 92, 158] },
  { t: 0.55, rgb: [70, 170, 195] },
  { t: 0.74, rgb: [255, 205, 60] },
  { t: 0.88, rgb: [255, 130, 30] },
  { t: 1.0, rgb: [220, 40, 40] },
];

function heatColor(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  let lo = HEAT_STOPS[0];
  let hi = HEAT_STOPS[HEAT_STOPS.length - 1];
  for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
    if (clamped >= HEAT_STOPS[i].t && clamped <= HEAT_STOPS[i + 1].t) {
      lo = HEAT_STOPS[i];
      hi = HEAT_STOPS[i + 1];
      break;
    }
  }
  const span = hi.t - lo.t || 1;
  const f = (clamped - lo.t) / span;
  const r = Math.round(lo.rgb[0] + (hi.rgb[0] - lo.rgb[0]) * f);
  const g = Math.round(lo.rgb[1] + (hi.rgb[1] - lo.rgb[1]) * f);
  const b = Math.round(lo.rgb[2] + (hi.rgb[2] - lo.rgb[2]) * f);
  return [r, g, b];
}

const BUY_SHADES = { light: "187, 247, 208", mid: "34, 197, 94", dark: "21, 128, 61" };
const SELL_SHADES = { light: "254, 202, 202", mid: "239, 68, 68", dark: "185, 28, 28" };
const BG_TOP = "#11142A";
const BG_BOTTOM = "#0A0C1B";
const AXIS_WIDTH = 68;
// Varsayılan görünüm 5dk'lık tamponun tamamını sıkıştırmak yerine son ~100sn'yi
// okunaklı genişlikte gösteriyor; geri kalanı sürükleyerek (kaydırarak) açılıyor.
const COL_W = 5;

function fmtAxisPrice(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function HeatmapWall({
  data,
  trades,
  height = 380,
}: {
  data: HeatmapResponse | undefined;
  trades?: LargeTrade[];
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // null = canlı takip (en son satır sağda). Doluysa: pencerenin sağ ucundaki
  // satırın "time" değeri — footprint grafiğindeki sürükleme mantığıyla aynı.
  const [anchorTime, setAnchorTime] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startEndIdx: number } | null>(null);

  function resolveEndIdx(rows: { time: string }[]): number {
    if (rows.length === 0) return 0;
    const idx = anchorTime ? rows.findIndex((r) => r.time === anchorTime) : -1;
    return idx === -1 ? rows.length : idx + 1;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rows = data?.rows ?? [];
    if (rows.length === 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startEndIdx: resolveEndIdx(rows) };
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const rows = data?.rows ?? [];
    if (!drag || rows.length === 0) return;
    const deltaCols = Math.round((e.clientX - drag.startX) / COL_W);
    const visibleCount = Math.max(1, Math.min(rows.length, Math.floor((containerRef.current?.clientWidth ?? 0) - AXIS_WIDTH) / COL_W));
    let newEndIdx = drag.startEndIdx - deltaCols;
    newEndIdx = Math.max(visibleCount, Math.min(rows.length, newEndIdx));
    setAnchorTime(newEndIdx >= rows.length ? null : rows[newEndIdx - 1].time);
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

      // Arka plan — money-maker'daki referans grafik kartlarıyla aynı koyu lacivert dil.
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, BG_TOP);
      bg.addColorStop(1, BG_BOTTOM);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      if (!data || !data.ready || data.rows.length === 0 || data.priceLevels.length === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Canlı derinlik akışı senkronize ediliyor...", width / 2, height / 2);
        return;
      }

      const { priceLevels } = data;
      const plotWidth = width - AXIS_WIDTH;

      // Son 5dk'lık tamponun tamamını sıkıştırmak yerine sabit kolon genişliğiyle
      // (COL_W) sığan kadarını göster — anchorTime doluysa o satır sağ ucta durur
      // (geçmişe sürükleme), boşsa en son satır sağda (canlı takip).
      const visibleCount = Math.max(1, Math.min(data.rows.length, Math.floor(plotWidth / COL_W)));
      const anchorIdx = anchorTime ? data.rows.findIndex((r) => r.time === anchorTime) : -1;
      const endIdx = anchorIdx === -1 ? data.rows.length : anchorIdx + 1;
      const startIdx = Math.max(0, endIdx - visibleCount);
      const rows = data.rows.slice(startIdx, endIdx);

      const colW = plotWidth / Math.max(rows.length, 1);
      const rowH = height / priceLevels.length;

      // Referans normal ("çoğunluk") seviyeyi bulmak için tüm dolu hücrelerin ~85.
      // yüzdelik dilimini kullanıyoruz — tek bir uç değer (en büyük hücre) referans
      // alınırsa sıradan likidite bile "sıcak" görünüyordu, ekran baştan sona renkli
      // oluyordu. Sadece gerçekten kalabalık (destek/direnç gibi) bölgeler parlasın diye
      // referansı düşük tutup üstüne 2.4 kuvvetli bir eğri uyguluyoruz.
      const allQty: number[] = [];
      for (const row of rows) {
        for (const q of row.bid) if (q > 0) allQty.push(q);
        for (const q of row.ask) if (q > 0) allQty.push(q);
      }
      allQty.sort((a, b) => a - b);
      const refQty = allQty.length > 0 ? allQty[Math.floor(allQty.length * 0.92)] || allQty[allQty.length - 1] : 1e-9;
      const normalize = (qty: number) => Math.pow(Math.min(1, qty / (refQty * 1.3)), 2.8);

      // priceLevels ascending (dusukten yukari) - canvas'ta yukarisi = yuksek fiyat.
      const levelIndexToY = (levelIdx: number) => height - (levelIdx + 0.5) * rowH;

      for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri];
        const x = ri * colW;
        for (let li = 0; li < priceLevels.length; li++) {
          const qty = row.bid[li] + row.ask[li];
          if (qty <= 0) continue;
          const t = normalize(qty);
          const [r, g, b] = heatColor(t);
          // Düşük yoğunluklu hücreler arka planla karışsın (neredeyse görünmesin),
          // sadece gerçekten kalabalık bölgeler belirgin şekilde parlasın.
          const alpha = 0.04 + t * 0.94;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          const y = levelIndexToY(li) - rowH / 2;
          ctx.fillRect(x, y, colW + 0.5, rowH + 0.5);
        }
      }

      // Fiyat ekseni etiketleri (sag tarafta ~6 esit aralikli seviye).
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const labelCount = 6;
      for (let i = 0; i <= labelCount; i++) {
        const li = Math.round((priceLevels.length - 1) * (i / labelCount));
        const y = levelIndexToY(li);
        ctx.fillText(fmtAxisPrice(priceLevels[li]), plotWidth + 6, y);
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(plotWidth, y);
        ctx.stroke();
      }

      // İşlem baloncukları — Bookmap'teki gibi çizgi yok, sadece boyutu işlem büyüklüğüne
      // göre ölçeklenen yeşil (agresif alım) / kırmızı (agresif satım) baloncuklar.
      if (trades && trades.length > 1) {
        const minPrice = priceLevels[0];
        const maxPrice = priceLevels[priceLevels.length - 1];
        const priceRange = maxPrice - minPrice || 1;
        const priceToY = (price: number) => height - ((price - minPrice) / priceRange) * height;

        const firstTime = new Date(rows[0].time).getTime();
        const lastTime = new Date(rows[rows.length - 1].time).getTime();
        const timeRange = lastTime - firstTime || 1;

        const maxQuote = Math.max(...trades.map((t) => t.quoteQty), 1e-9);
        const minR = 1.8;
        const maxR = 10;

        // Sırala: büyük baloncuklar altta, küçükler üstte çizilsin ki hiçbiri tamamen gömülmesin.
        const sorted = [...trades].sort((a, b) => b.quoteQty - a.quoteQty);

        for (const t of sorted) {
          const tTime = new Date(t.time).getTime();
          if (tTime < firstTime || tTime > lastTime) continue;
          const x = ((tTime - firstTime) / timeRange) * plotWidth;
          const y = priceToY(t.price);
          if (y < 0 || y > height) continue;
          const r = minR + Math.sqrt(t.quoteQty / maxQuote) * (maxR - minR);
          const { mid, dark } = t.side === "BUY" ? BUY_SHADES : SELL_SHADES;

          // Bookmap referansındaki gibi düz (matte) nokta — parlak/camsı gradyan ve
          // gölge kaldırıldı, ısı haritasıyla rekabet edip gürültü yaratıyordu.
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${mid}, 0.72)`;
          ctx.fill();
          ctx.lineWidth = Math.max(0.5, r * 0.1);
          ctx.strokeStyle = `rgba(${dark}, 0.85)`;
          ctx.stroke();
        }
      }
    }

    draw();
    const resizeObserver = new ResizeObserver(() => draw());
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [data, trades, height, anchorTime]);

  const isLive = anchorTime == null;

  return (
    <div className="relative">
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
      {!isLive && (
        <button
          type="button"
          onClick={() => setAnchorTime(null)}
          className="absolute right-[76px] top-2 flex items-center gap-1 rounded-md border border-purple/25 bg-card/90 px-1.5 py-0.5 text-tag text-purple shadow transition-colors hover:bg-card-hover"
          title="Canlıya dön"
        >
          <RotateCcw className="size-3" /> Canlı
        </button>
      )}
    </div>
  );
}
