import type {
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  ISeriesPrimitiveBase,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  PrimitiveHoveredItem,
  SeriesAttachedParameter,
  Time,
} from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { ChartPoint, ChartShape, DrawingTool } from "@/lib/types/curriculum";
import { TOOL_COLORS } from "./tool-meta";
import {
  channelSecondLine,
  distance,
  distanceToRay,
  distanceToSegment,
  isInsideEllipse,
  isInsideRect,
  HANDLE_RADIUS,
  LINE_TOLERANCE,
  type XY,
} from "./hit-test";

export type HandleKind = "p1" | "p2" | "p3" | "body";

export type PreviewShape = { tool: DrawingTool; p1: ChartPoint; p2?: ChartPoint; p3?: ChartPoint };

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

function formatDelta(seconds: number): string {
  const abs = Math.abs(seconds);
  if (abs < 3600) return `${Math.round(abs / 60)}dk`;
  if (abs < 86400) return `${Math.round(abs / 3600)}s`;
  return `${Math.round(abs / 86400)}g`;
}

// "position-long"/"position-short": p2 hedefi işaretler, stop entry etrafında
// simetrik olarak (1:1 R:R) hesaplanır.
function positionBounds(shape: ChartShape): { entry: number; target: number; stop: number } | null {
  if (!shape.p2) return null;
  const entry = shape.p1.price;
  const target = shape.p2.price;
  const stop = 2 * entry - target;
  return { entry, target, stop };
}

class DrawingPaneRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly _primitive: DrawingLayerPrimitive) {}

  draw(target: CanvasRenderingTarget2D): void {
    const chart = this._primitive.chart;
    const series = this._primitive.series;
    if (!chart || !series) return;

    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const toXY = (p: ChartPoint): XY | null => {
        const x = chart.timeScale().timeToCoordinate(p.time as unknown as Time);
        const y = series.priceToCoordinate(p.price);
        if (x === null || y === null) return null;
        return { x, y };
      };
      const width = mediaSize.width;
      const height = mediaSize.height;

      const drawHandles = (points: XY[], color: string) => {
        for (const p of points) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#0E1626";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = color;
          ctx.stroke();
        }
      };

      const drawOne = (
        shape: { tool: DrawingTool; p1: ChartPoint; p2?: ChartPoint; p3?: ChartPoint; text?: string; color: string },
        opts: { dashed?: boolean; selected?: boolean }
      ) => {
        const a = toXY(shape.p1);
        if (!a) return;
        ctx.strokeStyle = shape.color;
        ctx.fillStyle = shape.color + "33";
        ctx.lineWidth = 2;
        ctx.setLineDash(opts.dashed ? [6, 4] : []);

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
        } else if (shape.tool === "note" || shape.tool === "text") {
          if (shape.tool === "note") {
            ctx.beginPath();
            ctx.arc(a.x, a.y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          if (shape.text) {
            ctx.font = shape.tool === "text" ? "bold 13px sans-serif" : "12px sans-serif";
            ctx.fillStyle = shape.color;
            ctx.fillText(shape.text, a.x + (shape.tool === "text" ? 0 : 8), a.y - 8);
          }
        } else if (shape.p2) {
          const b = toXY(shape.p2);
          if (!b) return;
          if (shape.tool === "trendline" || shape.tool === "measure") {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            if (shape.tool === "measure") {
              const pctChange = ((shape.p2.price - shape.p1.price) / shape.p1.price) * 100;
              const secs = shape.p2.time - shape.p1.time;
              const label = `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(2)}% · ${formatDelta(secs)}`;
              ctx.font = "11px sans-serif";
              ctx.fillStyle = shape.color;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              ctx.fillText(label, mx + 6, my - 6);
            }
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
          } else if (shape.tool === "fibonacci") {
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
          } else if (shape.tool === "channel") {
            const c = shape.p3 ? toXY(shape.p3) : null;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            if (c) {
              const { a2, b2 } = channelSecondLine(a, b, c);
              ctx.beginPath();
              ctx.moveTo(a2.x, a2.y);
              ctx.lineTo(b2.x, b2.y);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(a2.x, a2.y);
              ctx.lineTo(b2.x, b2.y);
              ctx.lineTo(b.x, b.y);
              ctx.closePath();
              ctx.fill();
            }
          } else if (shape.tool === "position-long" || shape.tool === "position-short") {
            const bounds = positionBounds(shape as ChartShape);
            if (bounds) {
              const stopY = series.priceToCoordinate(bounds.stop);
              if (stopY !== null) {
                const x1 = Math.min(a.x, b.x);
                const x2 = Math.max(a.x, b.x);
                ctx.setLineDash([]);
                ctx.fillStyle = "#22C55E33";
                ctx.fillRect(x1, Math.min(a.y, b.y), x2 - x1, Math.abs(b.y - a.y));
                ctx.fillStyle = "#EF444433";
                ctx.fillRect(x1, Math.min(a.y, stopY), x2 - x1, Math.abs(stopY - a.y));
                ctx.strokeStyle = "#22C55E";
                ctx.beginPath();
                ctx.moveTo(x1, b.y);
                ctx.lineTo(x2, b.y);
                ctx.stroke();
                ctx.strokeStyle = "#EF4444";
                ctx.beginPath();
                ctx.moveTo(x1, stopY);
                ctx.lineTo(x2, stopY);
                ctx.stroke();
                ctx.strokeStyle = shape.color;
                ctx.beginPath();
                ctx.moveTo(x1, a.y);
                ctx.lineTo(x2, a.y);
                ctx.stroke();
                ctx.font = "11px sans-serif";
                ctx.fillStyle = "#F5F1EA";
                ctx.fillText("1:1 R:R", x2 + 4, a.y + 4);
              }
            }
          }
        }
        ctx.setLineDash([]);

        if (opts.selected) {
          const handles: XY[] = [a];
          if (shape.p2) {
            const b = toXY(shape.p2);
            if (b) handles.push(b);
          }
          if (shape.p3) {
            const c = toXY(shape.p3);
            if (c) handles.push(c);
          }
          drawHandles(handles, shape.color);
        }
      };

      this._primitive.shapes.forEach((s) => drawOne(s, { selected: s.id === this._primitive.selectedId }));
      if (this._primitive.preview) {
        drawOne({ ...this._primitive.preview, color: TOOL_COLORS[this._primitive.preview.tool] }, { dashed: true });
      }
      if (this._primitive.pendingAnchor) {
        const a = toXY(this._primitive.pendingAnchor);
        if (a) {
          ctx.beginPath();
          ctx.arc(a.x, a.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#3B5BFF";
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#F5F1EA";
          ctx.stroke();
        }
      }
    });
  }
}

class DrawingPaneView implements IPrimitivePaneView {
  constructor(private readonly _primitive: DrawingLayerPrimitive) {}
  renderer(): IPrimitivePaneRenderer | null {
    return new DrawingPaneRenderer(this._primitive);
  }
}

export class DrawingLayerPrimitive implements ISeriesPrimitiveBase<SeriesAttachedParameter<Time>> {
  chart: IChartApi | null = null;
  series: ISeriesApi<"Candlestick"> | null = null;
  shapes: ChartShape[] = [];
  selectedId: string | null = null;
  preview: PreviewShape | null = null;
  pendingAnchor: ChartPoint | null = null;

  private _requestUpdate: (() => void) | null = null;
  private readonly _paneView = new DrawingPaneView(this);

  attached(param: SeriesAttachedParameter<Time>): void {
    this.chart = param.chart;
    this.series = param.series as ISeriesApi<"Candlestick">;
    this._requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this.chart = null;
    this.series = null;
    this._requestUpdate = null;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView];
  }

  setShapes(shapes: ChartShape[]): void {
    this.shapes = shapes;
    this._requestUpdate?.();
  }

  setSelectedId(id: string | null): void {
    this.selectedId = id;
    this._requestUpdate?.();
  }

  setPreview(preview: PreviewShape | null): void {
    this.preview = preview;
    this._requestUpdate?.();
  }

  setPendingAnchor(point: ChartPoint | null): void {
    this.pendingAnchor = point;
    this._requestUpdate?.();
  }

  private _toXY(p: ChartPoint): XY | null {
    if (!this.chart || !this.series) return null;
    const x = this.chart.timeScale().timeToCoordinate(p.time as unknown as Time);
    const y = this.series.priceToCoordinate(p.price);
    if (x === null || y === null) return null;
    return { x, y };
  }

  hitTest(x: number, y: number): PrimitiveHoveredItem | null {
    const point: XY = { x, y };
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const s = this.shapes[i];
      if (s.locked) continue;
      const a = this._toXY(s.p1);
      if (!a) continue;
      const b = s.p2 ? this._toXY(s.p2) : null;
      const c = s.p3 ? this._toXY(s.p3) : null;

      if (s.id === this.selectedId) {
        const handles: Array<[HandleKind, XY | null]> = [
          ["p1", a],
          ["p2", b],
          ["p3", c],
        ];
        for (const [kind, hp] of handles) {
          if (!hp) continue;
          const d = distance(point, hp);
          if (d <= HANDLE_RADIUS) {
            return {
              externalId: `${s.id}::${kind}`,
              distance: d,
              cursorStyle: "grab",
              hitTestPriority: 2,
              zOrder: "normal",
            };
          }
        }
      }

      const bodyHit = this._bodyHit(s, point, a, b);
      if (bodyHit !== null) {
        return {
          externalId: `${s.id}::body`,
          distance: bodyHit,
          cursorStyle: "move",
          hitTestPriority: 1,
          zOrder: "normal",
        };
      }
    }
    return null;
  }

  private _bodyHit(s: ChartShape, p: XY, a: XY, b: XY | null): number | null {
    switch (s.tool) {
      case "horizontal": {
        const d = Math.abs(p.y - a.y);
        return d <= LINE_TOLERANCE ? d : null;
      }
      case "vertical": {
        const d = Math.abs(p.x - a.x);
        return d <= LINE_TOLERANCE ? d : null;
      }
      case "note":
      case "text": {
        const d = distance(p, a);
        return d <= HANDLE_RADIUS ? d : null;
      }
      case "trendline":
      case "arrow":
      case "measure": {
        if (!b) return null;
        const d = distanceToSegment(p, a, b);
        return d <= LINE_TOLERANCE ? d : null;
      }
      case "ray": {
        if (!b) return null;
        const d = distanceToRay(p, a, b);
        return d <= LINE_TOLERANCE ? d : null;
      }
      case "rectangle":
      case "position-long":
      case "position-short": {
        if (!b) return null;
        return isInsideRect(p, a, b) ? 0 : null;
      }
      case "ellipse": {
        if (!b) return null;
        return isInsideEllipse(p, a, b) ? 0 : null;
      }
      case "fibonacci": {
        if (!b) return null;
        const d = distanceToSegment(p, a, b);
        return d <= LINE_TOLERANCE ? d : null;
      }
      case "channel": {
        if (!b) return null;
        const d1 = distanceToSegment(p, a, b);
        if (d1 <= LINE_TOLERANCE) return d1;
        if (s.p3) {
          const c = this._toXY(s.p3);
          if (c) {
            const { a2, b2 } = channelSecondLine(a, b, c);
            const d2 = distanceToSegment(p, a2, b2);
            if (d2 <= LINE_TOLERANCE) return d2;
          }
        }
        return null;
      }
      default:
        return null;
    }
  }
}

export type { ISeriesPrimitive };
