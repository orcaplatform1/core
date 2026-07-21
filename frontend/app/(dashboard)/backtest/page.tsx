"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, Time } from "lightweight-charts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useBacktestSymbols,
  useCandles,
  useRefreshSymbol,
  useChartDrawing,
  useSaveChartDrawing,
} from "@/lib/hooks/use-backtest";
import { uploadChartSnapshot } from "@/lib/hooks/use-storage";
import { useSendMentorMessage } from "@/lib/hooks/use-mentor";
import type { ChartShape, ChartPoint, DrawingTool } from "@/lib/types/curriculum";

type Category = "crypto" | "forex";
type Timeframe = "1d" | "1h";

const TOOL_LABELS: Record<DrawingTool, string> = {
  trendline: "Trend Çizgisi",
  orderblock: "Order Block",
  liquidity: "Likidite Alanı",
};

const TOOL_COLORS: Record<DrawingTool, string> = {
  trendline: "#4F6BFF",
  orderblock: "#F39C3D",
  liquidity: "#8A54FF",
};

export default function BacktestPage() {
  const [category, setCategory] = useState<Category | null>(null);
  const [symbol, setSymbol] = useState<string>("");
  const [timeframe, setTimeframe] = useState<Timeframe>("1d");
  const [note, setNote] = useState("");
  const [shapes, setShapes] = useState<ChartShape[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool | null>(null);
  const [pendingPoint, setPendingPoint] = useState<ChartPoint | null>(null);
  const [previewPoint, setPreviewPoint] = useState<ChartPoint | null>(null);
  const [sending, setSending] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const redrawRef = useRef<() => void>(() => {});

  const { data: symbols, isLoading: symbolsLoading } = useBacktestSymbols();
  const to = new Date().toISOString().slice(0, 10);
  const from = "2015-01-01";
  const { data: candles, isLoading: candlesLoading } = useCandles(symbol, timeframe, from, to);
  const refreshSymbol = useRefreshSymbol();
  const { data: savedDrawing } = useChartDrawing("backtest", symbol);
  const saveDrawing = useSaveChartDrawing();
  const sendMessage = useSendMentorMessage();

  function drawOneShape(
    ctx: CanvasRenderingContext2D,
    tool: DrawingTool,
    a: { x: number; y: number },
    b: { x: number; y: number },
    color: string,
    dashed: boolean
  ) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color + "33";
    ctx.lineWidth = 2;
    ctx.setLineDash(dashed ? [6, 4] : []);
    if (tool === "trendline") {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    } else {
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    }
    ctx.setLineDash([]);
  }

  const redraw = useCallback(() => {
    const canvas = overlayRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!canvas || !chart || !series) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const toXY = (p: ChartPoint) => {
      const x = chart.timeScale().timeToCoordinate(p.time as unknown as Time);
      const y = series.priceToCoordinate(p.price);
      if (x === null || y === null) return null;
      return { x, y };
    };

    shapes.forEach((s) => {
      const a = toXY(s.p1);
      const b = toXY(s.p2);
      if (!a || !b) return;
      drawOneShape(ctx, s.tool, a, b, s.color, false);
    });

    if (activeTool && pendingPoint && previewPoint) {
      const a = toXY(pendingPoint);
      const b = toXY(previewPoint);
      if (a && b) drawOneShape(ctx, activeTool, a, b, TOOL_COLORS[activeTool], true);
    }
  }, [shapes, activeTool, pendingPoint, previewPoint]);

  useEffect(() => {
    redrawRef.current = redraw;
    redraw();
  }, [redraw]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0D1728" },
        textColor: "#8D9BB6",
      },
      grid: {
        vertLines: { color: "#223554" },
        horzLines: { color: "#223554" },
      },
      width: containerRef.current.clientWidth,
      height: 420,
      timeScale: { borderColor: "#223554" },
      rightPriceScale: { borderColor: "#223554" },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#32D66B",
      downColor: "#FF5C5C",
      borderVisible: false,
      wickUpColor: "#32D66B",
      wickDownColor: "#FF5C5C",
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const syncOverlaySize = () => {
      if (containerRef.current && overlayRef.current) {
        const w = containerRef.current.clientWidth;
        overlayRef.current.width = w;
        overlayRef.current.height = 420;
        chart.applyOptions({ width: w });
      }
    };
    syncOverlaySize();

    const handleResize = () => {
      syncOverlaySize();
      redrawRef.current();
    };
    const rangeHandler = () => redrawRef.current();

    window.addEventListener("resize", handleResize);
    chart.timeScale().subscribeVisibleTimeRangeChange(rangeHandler);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.timeScale().unsubscribeVisibleTimeRangeChange(rangeHandler);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!seriesRef.current || !candles) return;
    const formatted = candles.map((c) => ({
      time: (new Date(c.timestamp).getTime() / 1000) as unknown as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    seriesRef.current.setData(formatted);
    redrawRef.current();
  }, [candles]);

  useEffect(() => {
    if (savedDrawing?.drawings) {
      setShapes(savedDrawing.drawings.shapes ?? []);
      setNote(savedDrawing.drawings.note ?? "");
    } else {
      setShapes([]);
      setNote("");
    }
    setActiveTool(null);
    setPendingPoint(null);
    setPreviewPoint(null);
  }, [savedDrawing]);

  function pointFromEvent(e: React.MouseEvent<HTMLCanvasElement>): ChartPoint | null {
    if (!chartRef.current || !seriesRef.current || !overlayRef.current) return null;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = chartRef.current.timeScale().coordinateToTime(x);
    const price = seriesRef.current.coordinateToPrice(y);
    if (time === null || price === null) return null;
    return { time: time as unknown as number, price };
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!activeTool) return;
    const point = pointFromEvent(e);
    if (!point) return;
    if (!pendingPoint) {
      setPendingPoint(point);
    } else {
      const newShape: ChartShape = {
        id: crypto.randomUUID(),
        tool: activeTool,
        p1: pendingPoint,
        p2: point,
        color: TOOL_COLORS[activeTool],
      };
      setShapes((prev) => [...prev, newShape]);
      setPendingPoint(null);
      setPreviewPoint(null);
      setActiveTool(null);
    }
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!pendingPoint) return;
    const point = pointFromEvent(e);
    if (point) setPreviewPoint(point);
  }

  function selectTool(tool: DrawingTool) {
    setActiveTool((prev) => (prev === tool ? null : tool));
    setPendingPoint(null);
    setPreviewPoint(null);
  }

  function removeShape(id: string) {
    setShapes((prev) => prev.filter((s) => s.id !== id));
  }

  function clearShapes() {
    setShapes([]);
  }

  async function handleSaveDrawing() {
    if (!symbol) return;
    try {
      await saveDrawing.mutateAsync({
        context: "backtest",
        symbol,
        drawings: { shapes, note },
      });
      toast.success("Çizim kaydedildi");
    } catch {
      toast.error("Kaydedilemedi");
    }
  }

  async function handleSendToMentor() {
    if (!containerRef.current || !symbol || !overlayRef.current) return;
    setSending(true);
    try {
      const mainCanvas = containerRef.current.querySelector("canvas");
      if (!mainCanvas) throw new Error("Grafik bulunamadı");
      const mc = mainCanvas as HTMLCanvasElement;
      const merged = document.createElement("canvas");
      merged.width = mc.width;
      merged.height = mc.height;
      const ctx = merged.getContext("2d");
      if (!ctx) throw new Error("Görüntü oluşturulamadı");
      ctx.drawImage(mc, 0, 0, merged.width, merged.height);
      ctx.drawImage(overlayRef.current, 0, 0, merged.width, merged.height);
      const blob: Blob | null = await new Promise((resolve) =>
        merged.toBlob((b) => resolve(b), "image/png")
      );
      if (!blob) throw new Error("Görüntü alınamadı");
      const key = await uploadChartSnapshot(blob);
      const content =
        `${symbol} (${timeframe === "1d" ? "Günlük" : "1 Saatlik"}) grafiği üzerinde bir analiz yaptım.` +
        (note.trim() ? ` Notum: ${note.trim()}` : "") +
        (shapes.length ? ` Grafik üzerinde ${shapes.length} çizim var.` : "") +
        " Bu grafiği değerlendirir misin?";
      await sendMessage.mutateAsync({ content, imageUrl: key });
      toast.success("Yapay Zeka Mentora gönderildi");
    } catch (err: any) {
      toast.error(err?.message ?? "Gönderilemedi");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#F5F8FF]">Backtest</h1>
        <p className="text-sm text-[#8D9BB6]">
          Geçmiş fiyat verisi üzerinde grafik incele, çizim araçlarıyla işaretle ve Yapay Zeka Mentordan değerlendirme al.
        </p>
      </div>

      {!category && (
        <div className="flex gap-4">
          <Button onClick={() => setCategory("crypto")}>Kripto</Button>
          <Button onClick={() => setCategory("forex")}>Forex</Button>
        </div>
      )}

      {category && !symbol && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium text-[#F5F8FF]">
              {category === "crypto" ? "Kripto Paritesi Seç" : "Forex/Emtia Paritesi Seç"}
            </h2>
            <Button variant="ghost" onClick={() => setCategory(null)}>
              Geri
            </Button>
          </div>
          {symbolsLoading ? (
            <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(category === "crypto" ? symbols?.crypto : symbols?.forex)?.map((s) => (
                <button
                  key={s}
                  onClick={() => setSymbol(s)}
                  className="rounded-xl border border-border bg-card-inner px-4 py-2 text-sm text-[#D7E1F8] hover:border-primary hover:text-[#F5F8FF]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {symbol && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-medium text-[#F5F8FF]">{symbol}</h2>
              <div className="flex rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setTimeframe("1d")}
                  className={`px-3 py-1.5 text-sm ${timeframe === "1d" ? "bg-primary text-white" : "bg-card-inner text-[#8D9BB6]"}`}
                >
                  Günlük
                </button>
                <button
                  onClick={() => setTimeframe("1h")}
                  className={`px-3 py-1.5 text-sm ${timeframe === "1h" ? "bg-primary text-white" : "bg-card-inner text-[#8D9BB6]"}`}
                >
                  1 Saatlik
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={refreshSymbol.isPending}
                onClick={() =>
                  refreshSymbol.mutate(
                    { symbol, timeframe },
                    {
                      onSuccess: () => toast.success("Grafik güncellendi"),
                      onError: () => toast.error("Güncellenemedi"),
                    }
                  )
                }
              >
                {refreshSymbol.isPending ? "Güncelleniyor..." : "Grafiği Güncelle"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSymbol("");
                  setShapes([]);
                  setNote("");
                  setActiveTool(null);
                }}
              >
                Parite Değiştir
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(TOOL_LABELS) as DrawingTool[]).map((tool) => (
              <button
                key={tool}
                onClick={() => selectTool(tool)}
                className="rounded-xl border px-3 py-1.5 text-sm transition"
                style={{
                  borderColor: activeTool === tool ? TOOL_COLORS[tool] : "#223554",
                  backgroundColor: activeTool === tool ? TOOL_COLORS[tool] + "22" : "#182338",
                  color: activeTool === tool ? "#F5F8FF" : "#D7E1F8",
                }}
              >
                {TOOL_LABELS[tool]}
              </button>
            ))}
            {activeTool && (
              <span className="text-xs text-[#8D9BB6]">
                {pendingPoint ? "İkinci noktayı işaretle" : "Başlangıç noktasını işaretle"}
              </span>
            )}
            {shapes.length > 0 && (
              <button onClick={clearShapes} className="ml-auto text-xs text-[#FF5C5C] hover:underline">
                Tüm çizimleri temizle
              </button>
            )}
          </div>

          <div className="relative rounded-2xl border border-border bg-card p-2">
            <div ref={containerRef} className="w-full" style={{ minHeight: 420 }} />
            <canvas
              ref={overlayRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              className="absolute left-2 top-2"
              style={{ height: 420, pointerEvents: activeTool ? "auto" : "none", cursor: activeTool ? "crosshair" : "default" }}
            />
            {candlesLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-[#8D9BB6] bg-card/80">
                Grafik yükleniyor...
              </div>
            )}
          </div>

          {shapes.length > 0 && (
            <ul className="space-y-2">
              {shapes.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card-inner px-3 py-2 text-sm text-[#D7E1F8]"
                >
                  <span style={{ color: s.color }}>{TOOL_LABELS[s.tool]}</span>
                  <button onClick={() => removeShape(s.id)} className="text-[#FF5C5C] hover:underline">
                    Sil
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-[#8D9BB6]">Not</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Bu grafikte gördüğün formasyon/yapı hakkında not al..."
                className="w-full rounded-xl border border-border bg-card-inner px-3 py-2 text-sm text-[#D7E1F8] outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" disabled={saveDrawing.isPending} onClick={handleSaveDrawing}>
                {saveDrawing.isPending ? "Kaydediliyor..." : "Çizimi Kaydet"}
              </Button>
              <Button disabled={sending} onClick={handleSendToMentor}>
                {sending ? "Gönderiliyor..." : "Yapay Zeka Mentora Gönder"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
