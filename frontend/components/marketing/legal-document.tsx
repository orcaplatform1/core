import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CalendarClock, Clock, FileText } from "lucide-react";
import { PageHero } from "./page-hero";
import { LegalPrintButton } from "./legal-print-button";
import type { PageBlock } from "@/lib/marketing/page-blocks-types";
import type { LegalPageSummary } from "@/lib/marketing/site-content-types";

// Yasal sayfalar (Kullanım Koşulları, Gizlilik Politikası, Çerez Politikası,
// Mesafeli Satış Sözleşmesi) hâlâ admin panelinden (Site İçeriği > Sayfalar)
// düz PageBlock dizisi olarak yönetiliyor — burada eklenen tek şey render
// katmanı: "Son Güncelleme" bloğu üst bilgi çubuğuna taşınıyor, sonraki her
// heading bloğu kendi bölümünü açıyor ve bu bölümlerden bir İçindekiler
// (TOC) üretiliyor. Bu yüzden içerik admin panelinden serbestçe düzenlenebilir
// kalırken sayfa "premium" bir hukuk-metni görünümü kazanıyor.

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

interface Section {
  id: string;
  title: string;
  blocks: PageBlock[];
}

function blockWordCount(block: PageBlock): number {
  if (block.type === "paragraph") return block.text.split(/\s+/).filter(Boolean).length;
  if (block.type === "bulletList") return block.items.join(" ").split(/\s+/).filter(Boolean).length;
  if (block.type === "heading") return block.text.split(/\s+/).filter(Boolean).length;
  return 0;
}

// Cayma hakkı, iptal/iade, sorumluluk ve mücbir sebep gibi kullanıcının gözden
// kaçırmaması gereken maddeler otomatik olarak vurgulu bir kutu içinde
// gösterilir — başlık metnine bakılarak tespit edilir, ekstra bir alan
// gerekmez.
const CALLOUT_KEYWORDS = ["cayma", "iptal", "iade", "sorumluluk", "mücbir", "yetki", "uyuşmazlık"];

function isCalloutSection(title: string): boolean {
  const lower = title.toLowerCase();
  return CALLOUT_KEYWORDS.some((kw) => lower.includes(kw));
}

function SectionBlocks({ blocks }: { blocks: PageBlock[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          const sizeClass = block.fontSize === "lg" ? "text-body-lg" : block.fontSize === "sm" ? "text-body-sm" : "text-body";
          return (
            <p key={i} className={`whitespace-pre-line leading-relaxed text-muted-foreground ${sizeClass}`}>
              {renderInlineMarkdown(block.text)}
            </p>
          );
        }
        if (block.type === "bulletList") {
          return (
            <ul key={i} className="flex flex-col gap-2">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2.5 text-body-sm text-foreground/90">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "image") {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={block.url} alt={block.alt ?? ""} className="w-full rounded-xl border border-border" />
          );
        }
        if (block.type === "divider") {
          return <hr key={i} className="my-2 border-border" />;
        }
        return null;
      })}
    </div>
  );
}

export function LegalDocument({
  title,
  blocks,
  heroImageSrc,
  currentSlug,
  relatedPages,
}: {
  title: string;
  blocks: PageBlock[];
  heroImageSrc?: string;
  currentSlug: string;
  relatedPages: LegalPageSummary[];
}) {
  let updatedLabel: string | null = null;
  let rest = blocks;
  if (blocks[0]?.type === "heading" && blocks[0].text.trim().toLowerCase().startsWith("son güncelleme")) {
    const dateBlock = blocks[1];
    updatedLabel = dateBlock?.type === "paragraph" ? dateBlock.text : null;
    rest = blocks.slice(2);
  }

  // İlk heading'den önceki paragraf(lar) varsa bunlar giriş/özet metni olarak
  // üst bilgi çubuğunun altında, bölüm listesinin dışında gösterilir.
  const firstHeadingIndex = rest.findIndex((b) => b.type === "heading");
  const leadBlocks = firstHeadingIndex === -1 ? rest : rest.slice(0, firstHeadingIndex);
  const sectionBlocks = firstHeadingIndex === -1 ? [] : rest.slice(firstHeadingIndex);

  const sections: Section[] = [];
  for (const block of sectionBlocks) {
    if (block.type === "heading") {
      sections.push({ id: slugify(block.text), title: block.text, blocks: [] });
    } else if (sections.length > 0) {
      sections[sections.length - 1].blocks.push(block);
    }
  }

  const totalWords = blocks.reduce((sum, b) => sum + blockWordCount(b), 0);
  const readingMinutes = Math.max(1, Math.round(totalWords / 200));

  const otherPages = relatedPages.filter((p) => p.slug !== currentSlug);

  return (
    <>
      <PageHero title={title} heroImageSrc={heroImageSrc} />

      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border pb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-badge text-primary">
            <FileText className="size-3.5" />
            Yasal Belge
          </span>
          {updatedLabel && (
            <span className="inline-flex items-center gap-1.5 text-body-xs text-muted-foreground">
              <CalendarClock className="size-3.5" />
              Son güncelleme: {updatedLabel}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-body-xs text-muted-foreground">
            <Clock className="size-3.5" />
            ~{readingMinutes} dk okuma
          </span>
          <div className="ml-auto">
            <LegalPrintButton />
          </div>
        </div>

        {leadBlocks.length > 0 && (
          <div className="border-b border-border py-8">
            <SectionBlocks blocks={leadBlocks} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-10 py-10 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 flex flex-col gap-6">
              <nav aria-label="İçindekiler">
                <p className="mb-3 text-badge uppercase tracking-wide text-muted-foreground">İçindekiler</p>
                <ul className="flex flex-col gap-1 border-l border-border pl-4">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="block py-1 text-body-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              {otherPages.length > 0 && (
                <div>
                  <p className="mb-3 text-badge uppercase tracking-wide text-muted-foreground">Diğer Yasal Belgeler</p>
                  <ul className="flex flex-col gap-1">
                    {otherPages.map((page) => (
                      <li key={page.slug}>
                        <Link
                          href={`/${page.slug}`}
                          className="flex items-center gap-1.5 py-1 text-body-sm text-muted-foreground transition-colors hover:text-primary"
                        >
                          {page.title}
                          <ArrowUpRight className="size-3.5 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>

          <div className="flex flex-col">
            {/* Mobilde sticky yan menü yerine katlanabilir bir İçindekiler listesi */}
            <details className="mb-8 rounded-xl border border-border bg-card-inner p-4 lg:hidden">
              <summary className="cursor-pointer text-card-title-sm text-foreground">İçindekiler</summary>
              <ul className="mt-3 flex flex-col gap-1">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="block py-1 text-body-sm text-muted-foreground hover:text-primary">
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </details>

            {sections.map((section, i) => {
              const callout = isCalloutSection(section.title);
              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-24 border-b border-border py-8 first:pt-0 last:border-b-0"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-badge text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2 className="text-h4 text-foreground">{section.title}</h2>
                  </div>
                  {callout ? (
                    <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
                      <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-amber-500" />
                      <SectionBlocks blocks={section.blocks} />
                    </div>
                  ) : (
                    <SectionBlocks blocks={section.blocks} />
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
