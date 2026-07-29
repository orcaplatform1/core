"use client";
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
  Type,
  Ruler,
  Magnet,
  Undo2,
  Trash2,
} from "lucide-react";
import type { DrawingTool, ChartShape } from "@/lib/types/curriculum";
import { TOOL_LABELS, TOOL_COLORS } from "@/lib/chart-drawing/tool-meta";

type Props = {
  activeTool: DrawingTool | null;
  onSelectTool: (tool: DrawingTool) => void;
  onDeselectTool: () => void;
  magnet: boolean;
  onToggleMagnet: () => void;
  pendingActive: boolean;
  shapes: ChartShape[];
  onUndo: () => void;
  onClearAll: () => void;
};

const TOOL_ICONS: Record<DrawingTool, React.ElementType> = {
  trendline: TrendingUp,
  horizontal: Minus,
  vertical: MoveVertical,
  ray: ArrowRight,
  rectangle: Square,
  ellipse: Circle,
  fibonacci: Percent,
  arrow: ArrowUpRight,
  note: StickyNote,
  channel: Rows3,
  "position-long": ArrowUpCircle,
  "position-short": ArrowDownCircle,
  text: Type,
  measure: Ruler,
};

const TOOL_GROUPS: DrawingTool[][] = [
  ["trendline", "ray", "horizontal", "vertical", "channel"],
  ["rectangle", "ellipse", "arrow", "fibonacci"],
  ["position-long", "position-short"],
  ["text", "note", "measure"],
];

export function ChartDrawingToolbar({
  activeTool,
  onSelectTool,
  onDeselectTool,
  magnet,
  onToggleMagnet,
  pendingActive,
  shapes,
  onUndo,
  onClearAll,
}: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 sm:w-14">
      <button
        onClick={onDeselectTool}
        title="Seç / Taşı"
        aria-label="Seç / Taşı"
        className="flex h-10 w-10 items-center justify-center rounded-xl border transition"
        style={{
          borderColor: activeTool === null ? "#3B5BFF" : "#1C2740",
          backgroundColor: activeTool === null ? "#3B5BFF22" : "#141E32",
          color: activeTool === null ? "#F5F1EA" : "#A8A6A0",
        }}
      >
        <MousePointer2 size={18} />
      </button>

      <div className="h-px w-full bg-border sm:h-px" />

      {TOOL_GROUPS.map((group, gi) => (
        <div key={gi} className="flex flex-row flex-wrap gap-2 sm:flex-col">
          {group.map((tool) => {
            const Icon = TOOL_ICONS[tool];
            return (
              <button
                key={tool}
                onClick={() => onSelectTool(tool)}
                title={TOOL_LABELS[tool]}
                aria-label={TOOL_LABELS[tool]}
                className="flex h-10 w-10 items-center justify-center rounded-xl border transition"
                style={{
                  borderColor: activeTool === tool ? TOOL_COLORS[tool] : "#1C2740",
                  backgroundColor: activeTool === tool ? TOOL_COLORS[tool] + "22" : "#141E32",
                  color: activeTool === tool ? "#F5F1EA" : "#A8A6A0",
                }}
              >
                <Icon size={18} />
              </button>
            );
          })}
          {gi < TOOL_GROUPS.length - 1 && <div className="h-px w-full bg-border" />}
        </div>
      ))}

      <div className="h-px w-full bg-border" />

      <button
        onClick={onToggleMagnet}
        title="Miknatis"
        aria-label="Miknatis"
        className="flex h-10 w-10 items-center justify-center rounded-xl border transition"
        style={{
          borderColor: magnet ? "#3B5BFF" : "#1C2740",
          backgroundColor: magnet ? "#3B5BFF22" : "#141E32",
          color: magnet ? "#F5F1EA" : "#A8A6A0",
        }}
      >
        <Magnet size={18} />
      </button>

      {activeTool && (
        <span className="text-center text-[10px] leading-tight text-[#A8A6A0]">
          {pendingActive ? "İkinci noktayı işaretle" : "Noktayı işaretle"}
        </span>
      )}

      {shapes.length > 0 && (
        <>
          <div className="h-px w-full bg-border" />
          <button
            onClick={onUndo}
            title="Geri al (son şekli sil)"
            aria-label="Geri al (son şekli sil)"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-[#A8A6A0] hover:text-[#F5F1EA]"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={onClearAll}
            title="Tumunu temizle"
            aria-label="Tumunu temizle"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-[#EF4444]"
          >
            <Trash2 size={18} />
          </button>
        </>
      )}
    </div>
  );
}
