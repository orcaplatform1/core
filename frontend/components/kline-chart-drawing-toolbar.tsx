"use client";
import { useEffect } from "react";
import {
  MousePointer2,
  TrendingUp,
  Minus,
  MoveVertical,
  ArrowRight,
  Square,
  Circle,
  Percent,
  ArrowUpRight,
  StickyNote,
  Rows3,
  ArrowUpCircle,
  ArrowDownCircle,
  Ruler,
  Magnet,
  Undo2,
  Trash2,
} from "lucide-react";
import { useDrawingTools, useMeasure, useUndoRedo } from "react-klinecharts-ui";

// klinecharts'ın kendi yerleşik overlay isimleri - eski DrawingTool enum'unun
// (lib/chart-drawing/tool-meta.ts) karşılığı. "ellipse" için tam eşdeğer
// olmadığından en yakın yerleşik araç olan "circle" kullanılıyor.
export type KlineDrawingTool =
  | "segment"
  | "rayLine"
  | "horizontalStraightLine"
  | "verticalStraightLine"
  | "parallelChannel"
  | "rect"
  | "circle"
  | "arrow"
  | "fibonacciLine"
  | "longPosition"
  | "shortPosition";

const TOOL_ICONS: Record<KlineDrawingTool, React.ElementType> = {
  segment: TrendingUp,
  rayLine: ArrowRight,
  horizontalStraightLine: Minus,
  verticalStraightLine: MoveVertical,
  parallelChannel: Rows3,
  rect: Square,
  circle: Circle,
  arrow: ArrowUpRight,
  fibonacciLine: Percent,
  longPosition: ArrowUpCircle,
  shortPosition: ArrowDownCircle,
};

export const KLINE_TOOL_LABELS: Record<KlineDrawingTool, string> = {
  segment: "Trend Çizgisi",
  rayLine: "Ray",
  horizontalStraightLine: "Yatay Çizgi",
  verticalStraightLine: "Dikey Çizgi",
  parallelChannel: "Kanal",
  rect: "Dikdörtgen",
  circle: "Elips",
  arrow: "Ok",
  fibonacciLine: "Fibonacci",
  longPosition: "Uzun Pozisyon",
  shortPosition: "Kısa Pozisyon",
};

const TOOL_GROUPS: KlineDrawingTool[][] = [
  ["segment", "rayLine", "horizontalStraightLine", "verticalStraightLine", "parallelChannel"],
  ["rect", "circle", "arrow", "fibonacciLine"],
  ["longPosition", "shortPosition"],
];

type Props = {
  noteActive: boolean;
  onToggleNote: () => void;
};

export function KlineChartDrawingToolbar({ noteActive, onToggleNote }: Props) {
  const {
    activeTool,
    magnetMode,
    setMagnetMode,
    selectTool,
    clearActiveTool,
    overlays,
    removeAllDrawings,
    setAutoRetrigger,
  } = useDrawingTools();
  const { isActive: measureActive, startMeasure, cancelMeasure } = useMeasure();
  const { canUndo, undo } = useUndoRedo();

  // Kütüphanenin autoRetrigger varsayılanı (true) bir şekil bitince aynı
  // araçla otomatik yeni bir çizim baslatiyor - bu da grafik surekli "cizim
  // modunda" kalip az once cizilen sekli tiklayip duzenlemeyi engelliyor.
  // Kapatinca bir sekil bitince chart normal (secim/duzenleme) moduna donuyor.
  useEffect(() => {
    setAutoRetrigger(false);
  }, [setAutoRetrigger]);

  const nothingActive = activeTool === null && !measureActive && !noteActive;
  const magnetOn = magnetMode !== "normal";

  function handleSelect(tool: KlineDrawingTool) {
    if (measureActive) cancelMeasure();
    if (noteActive) onToggleNote();
    selectTool(tool);
  }

  function handleSelectMeasure() {
    if (noteActive) onToggleNote();
    clearActiveTool();
    if (measureActive) cancelMeasure();
    else startMeasure();
  }

  function handleSelectNote() {
    if (measureActive) cancelMeasure();
    clearActiveTool();
    onToggleNote();
  }

  function handleDeselect() {
    clearActiveTool();
    if (measureActive) cancelMeasure();
    if (noteActive) onToggleNote();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 sm:w-14">
      <button
        onClick={handleDeselect}
        title="Seç / Taşı"
        aria-label="Seç / Taşı"
        className="flex h-10 w-10 items-center justify-center rounded-xl border transition"
        style={{
          borderColor: nothingActive ? "#3B5BFF" : "#1C2740",
          backgroundColor: nothingActive ? "#3B5BFF22" : "#141E32",
          color: nothingActive ? "#F5F1EA" : "#A8A6A0",
        }}
      >
        <MousePointer2 size={18} />
      </button>

      <div className="h-px w-full bg-border" />

      {TOOL_GROUPS.map((group, gi) => (
        <div key={gi} className="flex flex-row flex-wrap gap-2 sm:flex-col">
          {group.map((tool) => {
            const Icon = TOOL_ICONS[tool];
            const active = activeTool === tool;
            return (
              <button
                key={tool}
                onClick={() => handleSelect(tool)}
                title={KLINE_TOOL_LABELS[tool]}
                aria-label={KLINE_TOOL_LABELS[tool]}
                className="flex h-10 w-10 items-center justify-center rounded-xl border transition"
                style={{
                  borderColor: active ? "#3B5BFF" : "#1C2740",
                  backgroundColor: active ? "#3B5BFF22" : "#141E32",
                  color: active ? "#F5F1EA" : "#A8A6A0",
                }}
              >
                <Icon size={18} />
              </button>
            );
          })}
          <div className="h-px w-full bg-border" />
        </div>
      ))}

      <div className="flex flex-row flex-wrap gap-2 sm:flex-col">
        <button
          onClick={handleSelectNote}
          title="Not"
          aria-label="Not"
          className="flex h-10 w-10 items-center justify-center rounded-xl border transition"
          style={{
            borderColor: noteActive ? "#3B5BFF" : "#1C2740",
            backgroundColor: noteActive ? "#3B5BFF22" : "#141E32",
            color: noteActive ? "#F5F1EA" : "#A8A6A0",
          }}
        >
          <StickyNote size={18} />
        </button>
        <button
          onClick={handleSelectMeasure}
          title="Ölçüm"
          aria-label="Ölçüm"
          className="flex h-10 w-10 items-center justify-center rounded-xl border transition"
          style={{
            borderColor: measureActive ? "#3B5BFF" : "#1C2740",
            backgroundColor: measureActive ? "#3B5BFF22" : "#141E32",
            color: measureActive ? "#F5F1EA" : "#A8A6A0",
          }}
        >
          <Ruler size={18} />
        </button>
      </div>

      <div className="h-px w-full bg-border" />

      <button
        onClick={() => setMagnetMode(magnetOn ? "normal" : "strong")}
        title="Mıknatıs"
        aria-label="Mıknatıs"
        className="flex h-10 w-10 items-center justify-center rounded-xl border transition"
        style={{
          borderColor: magnetOn ? "#3B5BFF" : "#1C2740",
          backgroundColor: magnetOn ? "#3B5BFF22" : "#141E32",
          color: magnetOn ? "#F5F1EA" : "#A8A6A0",
        }}
      >
        <Magnet size={18} />
      </button>

      {activeTool && (
        <span className="text-center text-[10px] leading-tight text-[#A8A6A0]">Noktaları işaretle</span>
      )}

      {(overlays.length > 0 || canUndo) && (
        <>
          <div className="h-px w-full bg-border" />
          {canUndo && (
            <button
              onClick={undo}
              title="Geri al (son şekli sil)"
              aria-label="Geri al (son şekli sil)"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-[#A8A6A0] hover:text-[#F5F1EA]"
            >
              <Undo2 size={18} />
            </button>
          )}
          {overlays.length > 0 && (
            <button
              onClick={removeAllDrawings}
              title="Tümünü temizle"
              aria-label="Tümünü temizle"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-[#EF4444]"
            >
              <Trash2 size={18} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
