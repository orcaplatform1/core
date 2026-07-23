"use client";
import { useState } from "react";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import type { ChartShape, ChartPoint, DrawingTool, Candle } from "@/lib/types/curriculum";
import { SINGLE_POINT_TOOLS } from "@/lib/types/curriculum";

export const TOOL_COLORS: Record<DrawingTool, string> = {
  trendline: "#4F6BFF",
  horizontal: "#32D66B",
  vertical: "#F39C3D",
  ray: "#4F6BFF",
  rectangle: "#8A54FF",
  ellipse: "#8A54FF",
  fibonacci: "#F5C542",
  arrow: "#FF5C5C",
  note: "#D7E1F8",
};

export const TOOL_LABELS: Record<DrawingTool, string> = {
  trendline: "Trend Çizgisi",
  horizontal: "Yatay Çizgi",
  vertical: "Dikey Çizgi",
  ray: "Ray",
  rectangle: "Dikdörtgen",
  ellipse: "Elips",
  fibonacci: "Fibonacci",
  arrow: "Ok",
  note: "Not",
};

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

type ChartRef = React.RefObject<IChartApi | null>;
type SeriesRef = React.RefObject<ISeriesApi<"Candlestick"> | null>;
type CanvasRef = React.RefObject<HTMLCanvasElement | null>;

type Args = {
  chartRef: ChartRef;
  seriesRef: SeriesRef;
  overlayRef: CanvasRef;
  candles: Candle[] | undefined;
};

export function useChartDrawingTools({ chartRef, seriesRef, overlayRef, candles }: Args) {
  const [shapes, setShapes] = useState<ChartShape[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool | null>(null);
  const [pendingPoint, setPendingPoint] = useState<ChartPoint | null>(null);
  const [previewPoint, setPreviewPoint] = useState<ChartPoint | null>(null);
  const [magnet, setMagnet] = useState(false);
  const [noteDraft, setNoteDraft] = useState<ChartPoint | null>(null);

  function snapToCandle(point: ChartPoint): ChartPoint {
    if (!magnet || !candles || candles.length === 0) return point;
    let closest = candles[0];
    let minDiff = Infinity;
    for (const c of candles) {
      const t = new Date(c.timestamp).getTime() / 1000;
      const diff = Math.abs(t - point.time);
      if (diff < minDiff) {
        minDiff = diff;
        closest = c;
      }
    }
    const t = new Date(closest.timestamp).getTime() / 1000;
    const options = [closest.open, closest.high, closest.low, closest.close];
    let closestPrice = options[0];
    let minPriceDiff = Infinity;
    for (const p of options) {
      const diff = Math.abs(p - point.price);
      if (diff < minPriceDiff) {
        minPriceDiff = diff;
        closestPrice = p;
      }
    }
    return { time: t, price: closestPrice };
  }

  function pointFromCoords(clientX: number, clientY: number): ChartPoint | null {
    if (!chartRef.current || !seriesRef.current || !overlayRef.current) return null;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const time = chartRef.current.timeScale().coordinateToTime(x);
    const price = seriesRef.current.coordinateToPrice(y);
    if (time === null || price === null) return null;
    return snapToCandle({ time: time as unknown as number, price });
  }

  function selectTool(tool: DrawingTool) {
    setActiveTool((prev) => (prev === tool ? null : tool));
    setPendingPoint(null);
    setPreviewPoint(null);
    setNoteDraft(null);
  }

  function handleClick(clientX: number, clientY: number) {
    if (!activeTool) return;
    const point = pointFromCoords(clientX, clientY);
    if (!point) return;

    if (activeTool === "note") {
      setNoteDraft(point);
      return;
    }

    if (SINGLE_POINT_TOOLS.includes(activeTool)) {
      const newShape: ChartShape = {
        id: crypto.randomUUID(),
        tool: activeTool,
        p1: point,
        color: TOOL_COLORS[activeTool],
        locked: false,
      };
      setShapes((prev) => [...prev, newShape]);
      setActiveTool(null);
      return;
    }

    if (!pendingPoint) {
      setPendingPoint(point);
    } else {
      const newShape: ChartShape = {
        id: crypto.randomUUID(),
        tool: activeTool,
        p1: pendingPoint,
        p2: point,
        color: TOOL_COLORS[activeTool],
        locked: false,
      };
      setShapes((prev) => [...prev, newShape]);
      setPendingPoint(null);
      setPreviewPoint(null);
      setActiveTool(null);
    }
  }

  function handleMouseMove(clientX: number, clientY: number) {
    if (!pendingPoint) return;
    const point = pointFromCoords(clientX, clientY);
    if (point) setPreviewPoint(point);
  }

  function confirmNote(text: string) {
    if (!noteDraft || !text.trim()) {
      setNoteDraft(null);
      setActiveTool(null);
      return;
    }
    const newShape: ChartShape = {
      id: crypto.randomUUID(),
      tool: "note",
      p1: noteDraft,
      text: text.trim(),
      color: TOOL_COLORS.note,
      locked: false,
    };
    setShapes((prev) => [...prev, newShape]);
    setNoteDraft(null);
    setActiveTool(null);
  }

  function cancelNote() {
    setNoteDraft(null);
    setActiveTool(null);
  }

  function removeShape(id: string) {
    setShapes((prev) => {
      const s = prev.find((x) => x.id === id);
      if (s?.locked) return prev;
      return prev.filter((x) => x.id !== id);
    });
  }

  function toggleLock(id: string) {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s)));
  }

  function clearShapes() {
    setShapes((prev) => prev.filter((s) => s.locked));
  }

  function loadShapes(newShapes: ChartShape[]) {
    setShapes(newShapes);
    setActiveTool(null);
    setPendingPoint(null);
    setPreviewPoint(null);
    setNoteDraft(null);
  }

  return {
    shapes,
    setShapes,
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
  };
}

export function drawShapesOnCanvas(
  ctx: CanvasRenderingContext2D,
  chart: IChartApi,
  series: ISeriesApi<"Candlestick">,
  shapes: ChartShape[],
  preview: { tool: DrawingTool; p1: ChartPoint; p2: ChartPoint } | null
) {
  const TOOL_COLORS_LOCAL = TOOL_COLORS;
  const toXY = (p: ChartPoint) => {
    const x = chart.timeScale().timeToCoordinate(p.time as unknown as Time);
    const y = series.priceToCoordinate(p.price);
    if (x === null || y === null) return null;
    return { x, y };
  };

  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  function drawShape(shape: { tool: DrawingTool; p1: ChartPoint; p2?: ChartPoint; text?: string; color: string }, dashed: boolean) {
    const a = toXY(shape.p1);
    if (!a) return;
    ctx.strokeStyle = shape.color;
    ctx.fillStyle = shape.color + "33";
    ctx.lineWidth = 2;
    ctx.setLineDash(dashed ? [6, 4] : []);

    if (shape.tool === "horizontal") {
      ctx.beginPath();
      ctx.moveTo(0, a.y);
      ctx.lineTo(width, a.y);
      ctx.stroke();
    } else if (shape.tool === "vertical") {
      ctx.beginPath();
      ctx.moveTo(a.x, 0);
      ctx.lineTo(a.x, height);
      ctx.stroke();
    } else if (shape.tool === "note") {
      ctx.beginPath();
      ctx.arc(a.x, a.y, 4, 0, Math.PI * 2);
      ctx.fill();
      if (shape.text) {
        ctx.font = "12px sans-serif";
        ctx.fillStyle = shape.color;
        ctx.fillText(shape.text, a.x + 8, a.y - 8);
      }
    } else if (shape.p2) {
      const b = toXY(shape.p2);
      if (!b) return;
      if (shape.tool === "trendline") {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      } else if (shape.tool === "ray") {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const scale = (width * 2) / len;
        const ex = a.x + dx * scale;
        const ey = a.y + dy * scale;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      } else if (shape.tool === "rectangle") {
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const w = Math.abs(b.x - a.x);
        const h = Math.abs(b.y - a.y);
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (shape.tool === "ellipse") {
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const rx = Math.abs(b.x - a.x) / 2;
        const ry = Math.abs(b.y - a.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (shape.tool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const headLen = 10;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - headLen * Math.cos(angle - Math.PI / 6), b.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - headLen * Math.cos(angle + Math.PI / 6), b.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (shape.tool === "fibonacci" && shape.p2) {
        const top = Math.min(shape.p1.price, shape.p2.price);
        const bottom = Math.max(shape.p1.price, shape.p2.price);
        const range = bottom - top;
        const x1 = Math.min(a.x, b.x);
        const x2 = Math.max(a.x, b.x);
        ctx.font = "10px sans-serif";
        FIB_LEVELS.forEach((level) => {
          const price = bottom - range * level;
          const y = series.priceToCoordinate(price);
          if (y === null) return;
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
          ctx.fillStyle = shape.color;
          ctx.fillText(`${(level * 100).toFixed(1)}%`, x2 + 4, y + 3);
        });
      }
    }
    ctx.setLineDash([]);
  }

  shapes.forEach((s) => drawShape(s, false));
  if (preview) drawShape({ ...preview, color: TOOL_COLORS_LOCAL[preview.tool] }, true);
}
