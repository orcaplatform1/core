"use client";
import {
  TrendingUp,
  Minus,
  MoveVertical,
  ArrowRight,
  Square,
  Circle,
  Percent,
  ArrowUpRight,
  StickyNote,
  Magnet,
  Trash2,
} from "lucide-react";
import type { DrawingTool, ChartShape } from "@/lib/types/curriculum";
import { TOOL_LABELS, TOOL_COLORS } from "@/lib/hooks/use-chart-drawing-tools";

type Props = {
  activeTool: DrawingTool | null;
  onSelectTool: (tool: DrawingTool) => void;
  magnet: boolean;
  onToggleMagnet: () => void;
  pendingActive: boolean;
  shapes: ChartShape[];
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
};

const TOOLS: DrawingTool[] = [
  "trendline",
  "horizontal",
  "vertical",
  "ray",
  "rectangle",
  "ellipse",
  "fibonacci",
  "arrow",
  "note",
];

export function ChartDrawingToolbar({
  activeTool,
  onSelectTool,
  magnet,
  onToggleMagnet,
  pendingActive,
  shapes,
  onClearAll,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TOOLS.map((tool) => {
        const Icon = TOOL_ICONS[tool];
        return (
          <button
            key={tool}
            onClick={() => onSelectTool(tool)}
            title={TOOL_LABELS[tool]}
            aria-label={TOOL_LABELS[tool]}
            className="flex h-10 w-10 items-center justify-center rounded-xl border transition"
            style={{
              borderColor: activeTool === tool ? TOOL_COLORS[tool] : "#223554",
              backgroundColor: activeTool === tool ? TOOL_COLORS[tool] + "22" : "#182338",
              color: activeTool === tool ? "#F5F8FF" : "#D7E1F8",
            }}
          >
            <Icon size={18} />
          </button>
        );
      })}
      <button
        onClick={onToggleMagnet}
        title="Miknatis"
        aria-label="Miknatis"
        className="flex h-10 w-10 items-center justify-center rounded-xl border transition"
        style={{
          borderColor: magnet ? "#4F6BFF" : "#223554",
          backgroundColor: magnet ? "#4F6BFF22" : "#182338",
          color: magnet ? "#F5F8FF" : "#D7E1F8",
        }}
      >
        <Magnet size={18} />
      </button>
      {activeTool && (
        <span className="text-xs text-[#8D9BB6]">
          {pendingActive ? "Ikinci noktayi isaretle" : "Noktayi isaretle"}
        </span>
      )}
      {shapes.length > 0 && (
        <button
          onClick={onClearAll}
          title="Tumunu temizle"
          aria-label="Tumunu temizle"
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-border text-[#FF5C5C]"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
}
