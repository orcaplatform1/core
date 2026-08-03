"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { init, dispose } from "klinecharts";
import type { Chart, Crosshair, KLineData, Period, Point } from "klinecharts";
import { KlinechartsUIProvider, useAnnotations, useDrawingTools, useKlinechartsUI, useMeasure, useUndoRedo } from "react-klinecharts-ui";
import type { Datafeed } from "react-klinecharts-ui";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCandles, useChartDrawing, useSaveChartDrawing } from "@/lib/hooks/use-backtest";
import { uploadChartSnapshot } from "@/lib/hooks/use-storage";
import { useSendMentorMessage } from "@/lib/hooks/use-mentor";
import { KlineChartDrawingToolbar, KLINE_TOOL_LABELS, type KlineDrawingTool } from "@/components/kline-chart-drawing-toolbar";
import type { KlineChartDrawingData, KlineOverlayRecord, KlineAnnotationRecord } from "@/lib/types/curriculum";

type Props = {
  symbol: string;
  timeframe: string;
  timeframeLabel: string;
  context: "backtest";
};

// datafeed prop provider'da zorunlu ama mumları kendimiz (mevcut Binance/Yahoo
// akışı - useCandles) yükleyip setDataLoader ile besliyoruz; bu obje sadece
// tip uyumu için var, hiçbir metodu gerçekten çağrılmıyor.
const INERT_DATAFEED: Datafeed = {
  searchSymbols: async () => [],
  getHistoryKLineData: async () => [],
  subscribe: () => {},
  unsubscribe: () => {},
};

function periodFromTimeframe(timeframe: string): Period {
  if (timeframe === "1h") return { type: "hour", span: 1 };
  return { type: "day", span: 1 };
}

function toKLineData(candles: { timestamp: string; open: number; high: number; low: number; close: number; volume: number | null }[]): KLineData[] {
  return candles.map((c) => ({
    timestamp: new Date(c.timestamp).getTime(),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume ?? undefined,
  }));
}

export function KlineTradingChart(props: Props) {
  return (
    <KlinechartsUIProvider datafeed={INERT_DATAFEED} defaultTheme="dark">
      <KlineTradingChartInner {...props} />
    </KlinechartsUIProvider>
  );
}

function KlineTradingChartInner({ symbol, timeframe, timeframeLabel, context }: Props) {
  const [note, setNote] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [sending, setSending] = useState(false);
  const [noteToolActive, setNoteToolActive] = useState(false);
  const [pendingNotePoint, setPendingNotePoint] = useState<{ price: number; timestamp: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = useKlinechartsUI();
  const chart = state.chart;

  const { overlays, removeDrawing, setDrawingLocked } = useDrawingTools();
  const { annotations, addAnnotation, removeAnnotation, clearAnnotations } = useAnnotations();
  const { cancelMeasure, clearResult } = useMeasure();
  const { clear: clearUndoRedo } = useUndoRedo();

  const to = new Date().toISOString().slice(0, 10);
  const from = "2015-01-01";
  const { data: candles, isLoading: candlesLoading } = useCandles(symbol, timeframe, from, to);
  const { data: savedDrawing } = useChartDrawing<KlineChartDrawingData>(context, symbol);
  const saveDrawing = useSaveChartDrawing<KlineChartDrawingData>();
  const sendMessage = useSendMentorMessage();

  // init/dispose: symbol veya timeframe degistiginde chart komple yeniden
  // yaratilir (trading-chart.tsx'teki lightweight-charts davranisiyla ayni).
  useEffect(() => {
    if (!containerRef.current) return;
    const chartInstance = init(containerRef.current, {
      styles: {
        candle: {
          bar: {
            upColor: "#22C55E",
            downColor: "#EF4444",
            upBorderColor: "#22C55E",
            downBorderColor: "#EF4444",
            upWickColor: "#22C55E",
            downWickColor: "#EF4444",
          },
        },
        grid: {
          horizontal: { color: "#1C2740" },
          vertical: { color: "#1C2740" },
        },
      },
    });
    if (!chartInstance) return;
    dispatch({ type: "SET_CHART", chart: chartInstance });

    const handleResize = () => chartInstance.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      // Chart instance yok edildiginde ona bagli, provider'in kendi state'inde
      // (chart'tan bagimsiz) yasayan annotation/measure/undo gecmisini de
      // temizle - yoksa bir sonraki sembolde hayalet kayitlar kalir.
      clearAnnotations();
      cancelMeasure();
      clearResult();
      clearUndoRedo();
      dispose(containerRef.current!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe]);

  // setDataLoader pattern: mumlar (mevcut Binance/Yahoo akisi) yuklendiginde
  // chart'a beslenir, sonra setSymbol/setPeriod cagrisi getBars'i tetikler.
  useEffect(() => {
    if (!chart || !candles) return;
    const klineData = toKLineData(candles);
    chart.setDataLoader({
      getBars: ({ callback }) => callback(klineData, false),
    });
    chart.setSymbol({ ticker: symbol });
    chart.setPeriod(periodFromTimeframe(timeframe));
  }, [chart, candles, symbol, timeframe]);

  // Kayitli cizimi yukle
  useEffect(() => {
    if (!chart) return;
    if (savedDrawing?.drawings) {
      const { overlays: savedOverlays, annotations: savedAnnotations, note: savedNote } = savedDrawing.drawings;
      for (const o of savedOverlays ?? []) {
        chart.createOverlay({
          id: o.id,
          name: o.name,
          groupId: "drawing_tools",
          points: o.points,
          styles: o.styles as never,
          extendData: o.extendData,
          lock: o.lock ?? false,
          visible: o.visible ?? true,
        });
      }
      for (const a of savedAnnotations ?? []) {
        addAnnotation(a.text, a.price, a.timestamp, a.color);
      }
      setNote(savedNote ?? "");
    } else {
      setNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, savedDrawing]);

  // Not/Metin araci: klinecharts'ta useAnnotations() dogrudan click-yakalama
  // sunmuyor (fiyat/zaman onceden bilinmeli), o yuzden native onCandleBarClick
  // action'ina abone olup convertFromPixel ile tiklanan noktayi cikariyoruz -
  // dis overlay canvas yerine kutuphanenin kendi genel click API'si kullanilir.
  useEffect(() => {
    if (!chart || !noteToolActive) return;
    function handleClick(data?: unknown) {
      const crosshair = data as Crosshair | undefined;
      if (!crosshair || crosshair.x === undefined || crosshair.y === undefined) return;
      const converted = chart!.convertFromPixel([{ x: crosshair.x, y: crosshair.y }]) as Partial<Point> | Partial<Point>[];
      const point = Array.isArray(converted) ? converted[0] : converted;
      if (point?.timestamp == null || point?.value == null) return;
      setPendingNotePoint({ price: point.value, timestamp: point.timestamp });
    }
    chart.subscribeAction("onCandleBarClick", handleClick);
    return () => chart.unsubscribeAction("onCandleBarClick", handleClick);
  }, [chart, noteToolActive]);

  function handleToggleNoteTool() {
    setNoteToolActive((v) => !v);
    setPendingNotePoint(null);
  }

  function confirmNoteDraft(text: string) {
    if (pendingNotePoint && text.trim()) {
      addAnnotation(text.trim(), pendingNotePoint.price, pendingNotePoint.timestamp);
    }
    setPendingNotePoint(null);
    setNoteToolActive(false);
  }

  function cancelNoteDraft() {
    setPendingNotePoint(null);
    setNoteToolActive(false);
  }

  const handleSaveDrawing = useCallback(async () => {
    if (!symbol || !chart) return;
    try {
      const savedOverlays: KlineOverlayRecord[] = chart.getOverlays({ groupId: "drawing_tools" }).map((o) => ({
        id: o.id,
        name: o.name,
        points: o.points.map((p) => ({ timestamp: p.timestamp, value: p.value })),
        styles: o.styles ?? undefined,
        extendData: o.extendData,
        lock: o.lock,
        visible: o.visible,
      }));
      const savedAnnotations: KlineAnnotationRecord[] = annotations.map((a) => ({
        id: a.id,
        text: a.text,
        price: a.price,
        timestamp: a.timestamp,
        color: a.color,
      }));
      await saveDrawing.mutateAsync({ context, symbol, drawings: { overlays: savedOverlays, annotations: savedAnnotations, note } });
      toast.success("Çizim kaydedildi");
    } catch {
      toast.error("Kaydedilemedi");
    }
  }, [symbol, chart, context, annotations, note, saveDrawing]);

  const handleSendToMentor = useCallback(async () => {
    if (!chart || !symbol) return;
    setSending(true);
    try {
      const dataUrl = chart.getConvertPictureUrl(true, "png", "#0E1626");
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const key = await uploadChartSnapshot(blob);
      const content =
        `${symbol} (${timeframeLabel}) grafiği üzerinde bir analiz yaptım.` +
        (note.trim() ? ` Notum: ${note.trim()}` : "") +
        (overlays.length ? ` Grafik üzerinde ${overlays.length} çizim var.` : "") +
        " Bu grafiği değerlendirir misin?";
      await sendMessage.mutateAsync({ content, imageUrl: key });
      toast.success("Yapay Zeka Mentora gönderildi");
    } catch (err: any) {
      toast.error(err?.message ?? "Gönderilemedi");
    } finally {
      setSending(false);
    }
  }, [chart, symbol, timeframeLabel, note, overlays.length, sendMessage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <KlineChartDrawingToolbar noteActive={noteToolActive} onToggleNote={handleToggleNoteTool} />

        <div className="relative flex-1 rounded-2xl border border-border bg-card p-2">
          <div ref={containerRef} className="w-full" style={{ height: "min(70vh, 640px)", minHeight: 420 }} />
          {candlesLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[#A8A6A0] bg-card/80">
              Grafik yükleniyor...
            </div>
          )}
        </div>
      </div>

      {pendingNotePoint && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card-inner p-3">
          <input
            autoFocus
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Not metni..."
            className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-[#A8A6A0] outline-none focus:border-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                confirmNoteDraft(noteInput);
                setNoteInput("");
              }
            }}
          />
          <Button
            onClick={() => {
              confirmNoteDraft(noteInput);
              setNoteInput("");
            }}
          >
            Ekle
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              cancelNoteDraft();
              setNoteInput("");
            }}
          >
            İptal
          </Button>
        </div>
      )}

      {(overlays.length > 0 || annotations.length > 0) && (
        <ul className="space-y-2">
          {overlays.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card-inner px-3 py-2 text-sm"
            >
              <span className="text-[#A8A6A0]">
                {KLINE_TOOL_LABELS[o.name as KlineDrawingTool] ?? o.name}
                {o.locked ? " 🔒" : ""}
              </span>
              <span className="flex gap-3">
                <button onClick={() => setDrawingLocked(o.id, !o.locked)} className="text-[#A8A6A0] hover:underline">
                  {o.locked ? "Kilidi Aç" : "Kilitle"}
                </button>
                <button
                  onClick={() => removeDrawing(o.id)}
                  disabled={o.locked}
                  className={o.locked ? "text-[#6B6255]" : "text-[#EF4444] hover:underline"}
                >
                  Sil
                </button>
              </span>
            </li>
          ))}
          {annotations.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card-inner px-3 py-2 text-sm"
            >
              <span className="text-[#A8A6A0]">Not — {a.text}</span>
              <button onClick={() => removeAnnotation(a.id)} className="text-[#EF4444] hover:underline">
                Sil
              </button>
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
