"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, Time } from "lightweight-charts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCandles, useChartDrawing, useSaveChartDrawing } from "@/lib/hooks/use-backtest";
import { uploadChartSnapshot } from "@/lib/hooks/use-storage";
import { useSendMentorMessage } from "@/lib/hooks/use-mentor";
import { useChartDrawingTools } from "@/lib/hooks/use-chart-drawing-tools";
import { ChartDrawingToolbar } from "@/components/chart-drawing-toolbar";
import { TOOL_LABELS } from "@/lib/chart-drawing/tool-meta";

type Props = {
  symbol: string;
  timeframe: string;
  timeframeLabel: string;
  context: "backtest" | "simulation";
};

export function TradingChart({ symbol, timeframe, timeframeLabel, context }: Props) {
  const [note, setNote] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [sending, setSending] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const to = new Date().toISOString().slice(0, 10);
  const from = "2015-01-01";
  const { data: candles, isLoading: candlesLoading } = useCandles(symbol, timeframe, from, to);
  const { data: savedDrawing } = useChartDrawing(context, symbol);
  const saveDrawing = useSaveChartDrawing();
  const sendMessage = useSendMentorMessage();

  const {
    shapes,
    activeTool,
    pendingPoint,
    magnet,
    setMagnet,
    noteDraft,
    selectTool,
    deselectTool,
    confirmNote,
    cancelNote,
    removeShape,
    toggleLock,
    clearShapes,
    undoLastShape,
    loadShapes,
    attachToChart,
  } = useChartDrawingTools({ candles });

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0E1626" },
        textColor: "#A8A6A0",
      },
      grid: {
        vertLines: { color: "#1C2740" },
        horzLines: { color: "#1C2740" },
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      timeScale: { borderColor: "#1C2740" },
      rightPriceScale: { borderColor: "#1C2740" },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22C55E",
      downColor: "#EF4444",
      borderVisible: false,
      wickUpColor: "#22C55E",
      wickDownColor: "#EF4444",
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const detachDrawing = attachToChart(chart, series, containerRef.current);

    const handleResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      detachDrawing();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSaveDrawing = useCallback(async () => {
    if (!symbol) return;
    try {
      await saveDrawing.mutateAsync({ context, symbol, drawings: { shapes, note } });
      toast.success("Çizim kaydedildi");
    } catch {
      toast.error("Kaydedilemedi");
    }
  }, [symbol, context, shapes, note, saveDrawing]);

  const handleSendToMentor = useCallback(async () => {
    if (!containerRef.current || !symbol) return;
    setSending(true);
    try {
      const canvases = Array.from(containerRef.current.querySelectorAll("canvas"));
      if (canvases.length === 0) throw new Error("Grafik bulunamadı");
      const merged = document.createElement("canvas");
      merged.width = canvases[0].width;
      merged.height = canvases[0].height;
      const ctx = merged.getContext("2d");
      if (!ctx) throw new Error("Görüntü oluşturulamadı");
      for (const c of canvases) ctx.drawImage(c, 0, 0, merged.width, merged.height);
      const blob: Blob | null = await new Promise((resolve) => merged.toBlob((b) => resolve(b), "image/png"));
      if (!blob) throw new Error("Görüntü alınamadı");
      const key = await uploadChartSnapshot(blob);
      const content =
        `${symbol} (${timeframeLabel}) grafiği üzerinde bir analiz yaptım.` +
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
  }, [symbol, timeframeLabel, note, shapes, sendMessage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <ChartDrawingToolbar
          activeTool={activeTool}
          onSelectTool={selectTool}
          onDeselectTool={deselectTool}
          magnet={magnet}
          onToggleMagnet={() => setMagnet((m) => !m)}
          pendingActive={!!pendingPoint}
          shapes={shapes}
          onUndo={undoLastShape}
          onClearAll={clearShapes}
        />

        <div className="relative flex-1 rounded-2xl border border-border bg-card p-2">
          <div ref={containerRef} className="w-full" style={{ height: "min(70vh, 640px)", minHeight: 420 }} />
          {candlesLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[#A8A6A0] bg-card/80">
              Grafik yükleniyor...
            </div>
          )}
        </div>
      </div>

      {noteDraft && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card-inner p-3">
          <input
            autoFocus
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Not metni..."
            className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-[#A8A6A0] outline-none focus:border-primary"
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

      {shapes.length > 0 && (
        <ul className="space-y-2">
          {shapes.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card-inner px-3 py-2 text-sm"
            >
              <span style={{ color: s.color }}>
                {TOOL_LABELS[s.tool]}
                {s.text ? ` — ${s.text}` : ""}
                {s.locked ? " 🔒" : ""}
              </span>
              <span className="flex gap-3">
                <button onClick={() => toggleLock(s.id)} className="text-[#A8A6A0] hover:underline">
                  {s.locked ? "Kilidi Aç" : "Kilitle"}
                </button>
                <button
                  onClick={() => removeShape(s.id)}
                  disabled={s.locked}
                  className={s.locked ? "text-[#6B6255]" : "text-[#EF4444] hover:underline"}
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
          <label className="mb-1 block text-sm text-[#A8A6A0]">Not</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Bu grafikte gördüğün formasyon/yapı hakkında not al..."
            className="w-full rounded-xl border border-border bg-card-inner px-3 py-2 text-sm text-[#A8A6A0] outline-none focus:border-primary"
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
  );
}
