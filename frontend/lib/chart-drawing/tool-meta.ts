import type { DrawingTool } from "@/lib/types/curriculum";

export const TOOL_COLORS: Record<DrawingTool, string> = {
  trendline: "#3B5BFF",
  horizontal: "#22C55E",
  vertical: "#F39C3D",
  ray: "#3B5BFF",
  rectangle: "#8B5CF6",
  ellipse: "#8B5CF6",
  fibonacci: "#F5C542",
  arrow: "#EF4444",
  note: "#A69B8A",
  channel: "#5AC8E8",
  "position-long": "#22C55E",
  "position-short": "#EF4444",
  text: "#F5F1EA",
  measure: "#5A7CFF",
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
  channel: "Kanal",
  "position-long": "Uzun Pozisyon",
  "position-short": "Kısa Pozisyon",
  text: "Metin",
  measure: "Ölçüm",
};
