"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, Time } from "lightweight-charts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useBacktestSymbols,
  useCandles,
  useChartDrawing,
  useSaveChartDrawing,
} from "@/lib/hooks/use-backtest";
import { uploadChartSnapshot } from "@/lib/hooks/use-storage";
import { useSendMentorMessage } from "@/lib/hooks/use-mentor";
import { useChartDrawingTools, drawShapesOnCanvas } from "@/lib/hooks/use-chart-drawing-tools";
import { ChartDrawingToolbar } from "@/components/chart-drawing-toolbar";
import { TOOL_LABELS } from "@/lib/hooks/use-chart-drawing-tools";

type Category = "crypto" | "forex";
type Timeframe = "1d" | "1h";

export default function BacktestPage() {
  const [category, setCategory] = useState<Category | null>(null);
  const [symbol, setSymbol] = useState<string>("");
  const [timeframe, setTimeframe] = useState<Timeframe>("1d");
  const [note, setNote] = useState("");
  const [noteInput, setNoteInput] = useState("");
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
  const { data: savedDrawing } = useChartDrawing("backtest", symbol);
  const saveDrawing = useSaveChartDrawing();
  const sendMessage = useSendMentorMessage();

  const {
    shapes,
    activeTool,
    pendingPoint,
    previewPoint,
    magnet,
    setMagnet,
    noteDraft,
    selectTool,
    handleClick,
    handleMouseMove,
    confirmNote,
    cancelNote,
    removeShape,
    toggleLock,
    clearShapes,
    loadShapes,
  } = useChartDrawingTools({ chartRef, seriesRef, overlayRef, candles });

  const redraw = useCallback(() => {
    const canvas = overlayRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!canvas || !chart || !series) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const preview =
      activeTool && pendingPoint && previewPoint
        ? { tool: activeTool, p1: pendingPoint, p2: previewPoint }
        : null;
    drawShapesOnCanvas(ctx, chart, series, shapes, preview);
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
      loadShapes(savedDrawing.drawings.shapes ?? []);
      setNote(savedDrawing.drawings.note ?? "");
    } else {
      loadShapes([]);
      setNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedDrawing]);

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
            <Button
              variant="ghost"
              onClick={() => {
                setSymbol("");
              }}
            >
              Parite Değiştir
            </Button>
          </div>

          <ChartDrawingToolbar
            activeTool={activeTool}
            onSelectTool={selectTool}
            magnet={magnet}
            onToggleMagnet={() => setMagnet((m) => !m)}
            pendingActive={!!pendingPoint}
            shapes={shapes}
            onClearAll={clearShapes}
          />

          {noteDraft && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card-inner p-3">
              <input
                autoFocus
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Not metni..."
                className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-[#D7E1F8] outline-none focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    confirmNote(noteInput);
                    setNoteInput("");
                  }
                }}
              />
              <Button
                onClick={() => {
                  confirmNote(noteInput);
                  setNoteInput("");
                }}
              >
                Ekle
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  cancelNote();
                  setNoteInput("");
                }}
              >
                İptal
              </Button>
            </div>
          )}

          <div className="relative rounded-2xl border border-border bg-card p-2">
            <div ref={containerRef} className="w-full" style={{ minHeight: 420 }} />
            <canvas
              ref={overlayRef}
              onPointerDown={(e) => {
                e.preventDefault();
                if (!activeTool) return;
                handleClick(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (!activeTool) return;
                handleMouseMove(e.clientX, e.clientY);
              }}
              className="absolute left-2 top-2"
              style={{
                height: 420,
                width: "calc(100% - 16px)",
                pointerEvents: "auto",
                cursor: activeTool ? "crosshair" : "default",
                touchAction: "none",
              }}
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
                  <span style={{ color: s.color }}>
                    {TOOL_LABELS[s.tool]}
                    {s.text ? ` — ${s.text}` : ""}
                    {s.locked ? " 🔒" : ""}
                  </span>
                  <span className="flex gap-3">
                    <button onClick={() => toggleLock(s.id)} className="text-[#8D9BB6] hover:underline">
                      {s.locked ? "Kilidi Aç" : "Kilitle"}
                    </button>
                    <button
                      onClick={() => removeShape(s.id)}
                      disabled={s.locked}
                      className={s.locked ? "text-[#66738D]" : "text-[#FF5C5C] hover:underline"}
                    >
                      Sil
                    </button>
                  </span>
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
