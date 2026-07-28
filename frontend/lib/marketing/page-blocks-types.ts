export type HeadingSize = "sm" | "md" | "lg" | "xl";
export type TextSize = "sm" | "base" | "lg";

export type PageBlock =
  | { type: "heading"; text: string; size: HeadingSize }
  | { type: "paragraph"; text: string; fontSize?: TextSize; color?: string }
  | { type: "bulletList"; items: string[] }
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "divider" };

export type PageBlockType = PageBlock["type"];

export const BLOCK_TYPE_LABELS: Record<PageBlockType, string> = {
  heading: "Başlık",
  paragraph: "Metin",
  bulletList: "Madde Listesi",
  image: "Görsel",
  divider: "Ayırıcı",
};

export const HEADING_SIZE_LABELS: Record<HeadingSize, string> = {
  sm: "Küçük",
  md: "Orta",
  lg: "Büyük",
  xl: "Çok Büyük",
};

export const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  sm: "Küçük",
  base: "Normal",
  lg: "Büyük",
};
