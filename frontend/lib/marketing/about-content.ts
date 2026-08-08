import type { PageBlock } from "./page-blocks-types";

export type AboutDefinition = { term: string; description: string };

export type AboutParagraphContent =
  | { mode: "prose"; text: string }
  | { mode: "checklist"; intro?: string; items: string[]; outro?: string }
  | { mode: "definitions"; defs: AboutDefinition[] };

export type AboutSection = {
  heading: { text: string; size: "sm" | "md" | "lg" | "xl" } | null;
  blocks: (
    | { type: "paragraph"; content: AboutParagraphContent }
    | { type: "bulletList"; items: string[] }
    | { type: "image"; url: string; alt?: string; caption?: string }
  )[];
};

// Admin panelde metin bloklari duz satir sonlariyla (\n) yazilir ama mevcut
// PageBlocksRenderer bunlari tek bir <p> icine basiyor - HTML bosluk/satir
// sonlarini varsayilan olarak yok saydigi icin CANLIDA hepsi tek bir satira
// sikisiyor (bkz. /aboutorca'nin eski hali). Bu sinif, bir paragrafin ic
// yapisini (duz metin mi, kisa maddelerden olusan bir liste mi, yoksa
// "terim + aciklama" ikilileri mi) tahmin edip uygun bicimde render etmeyi
// mumkun kilar - admin metni nasil yazdiysa (kisa satirlar = liste, "kisa
// satir + uzun satir" nobetlesmesi = tanim listesi) otomatik uyum saglar,
// belirli kelimelere baglı degildir.
function classifyParagraph(text: string): AboutParagraphContent {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 4) {
    return { mode: "prose", text };
  }

  const isAlternatingDefinitions =
    lines.length >= 4 &&
    lines.length % 2 === 0 &&
    lines.every((line, i) => (i % 2 === 0 ? line.length <= 35 && !/[.!?]$/.test(line) : line.length > 35));

  if (isAlternatingDefinitions) {
    const defs: AboutDefinition[] = [];
    for (let i = 0; i < lines.length; i += 2) {
      defs.push({ term: lines[i], description: lines[i + 1] });
    }
    return { mode: "definitions", defs };
  }

  const shortLines = lines.filter((l) => l.length <= 45);
  if (shortLines.length / lines.length >= 0.6) {
    const longLines = lines.filter((l) => l.length > 45);
    return {
      mode: "checklist",
      intro: longLines[0],
      items: shortLines,
      outro: longLines.length > 1 ? longLines[longLines.length - 1] : undefined,
    };
  }

  return { mode: "prose", text };
}

// Bloklari, her "heading" blogunu yeni bir bolum baslangici sayarak gruplar -
// ilk basliktan once gelen paragraf(lar) baslıksiz bir "giris" bolumu olur.
export function groupBlocksIntoSections(blocks: PageBlock[]): AboutSection[] {
  const sections: AboutSection[] = [{ heading: null, blocks: [] }];

  for (const block of blocks) {
    if (block.type === "heading") {
      sections.push({ heading: { text: block.text, size: block.size }, blocks: [] });
      continue;
    }
    const current = sections[sections.length - 1];
    if (block.type === "paragraph") {
      current.blocks.push({ type: "paragraph", content: classifyParagraph(block.text) });
    } else if (block.type === "bulletList") {
      current.blocks.push({ type: "bulletList", items: block.items });
    } else if (block.type === "image") {
      current.blocks.push({ type: "image", url: block.url, alt: block.alt, caption: block.caption });
    }
    // "divider" bloklari bilincli olarak atlanir - bolumleme (her heading yeni
    // bolum) zaten ayni gorevi gorsel olarak daha iyi yapiyor.
  }

  return sections.filter((s) => s.heading !== null || s.blocks.length > 0);
}
