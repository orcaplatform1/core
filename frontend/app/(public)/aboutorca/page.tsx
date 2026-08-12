import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";
import { HeroBackground } from "@/components/marketing/hero-background";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { getPageBySlug, getSiteContent } from "@/lib/marketing/get-site-content";
import { groupBlocksIntoSections, type AboutSection } from "@/lib/marketing/about-content";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "ORCA, finans eğitiminin ihtiyaç duyduğu tüm bileşenleri tek çatı altında bir araya getiren yeni nesil bir finans eğitim ekosistemidir.",
};

const ACCENT_COLORS = ["#355CFF", "#8A54FF", "#32D66B", "#F39C3D"];

function headingClass(size: "sm" | "md" | "lg" | "xl") {
  switch (size) {
    case "xl":
      return "text-display-sm text-foreground";
    case "lg":
      return "text-h2 text-foreground";
    case "md":
      return "text-h3 text-foreground";
    default:
      return "text-h4 text-foreground";
  }
}

function SectionContent({ section, accent }: { section: AboutSection; accent: string }) {
  return (
    <div className="space-y-5">
      {section.blocks.map((block, i) => {
        if (block.type === "image") {
          return (
            <figure key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.url} alt={block.alt ?? ""} className="w-full rounded-2xl border border-border" />
              {block.caption && (
                <figcaption className="mt-2 text-center text-body-xs text-muted-foreground">{block.caption}</figcaption>
              )}
            </figure>
          );
        }

        if (block.type === "bulletList") {
          return (
            <ul key={i} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2.5 text-body-sm text-foreground/90">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: accent }} />
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        const content = block.content;
        if (content.mode === "prose") {
          return (
            <p key={i} className="max-w-[720px] whitespace-pre-line text-body text-muted-foreground leading-relaxed">
              {content.text}
            </p>
          );
        }

        if (content.mode === "checklist") {
          return (
            <div key={i} className="space-y-5">
              {content.intro && (
                <p className="max-w-[720px] text-body text-muted-foreground leading-relaxed">{content.intro}</p>
              )}
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {content.items.map((item, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2.5 rounded-xl border border-border bg-card-inner px-3.5 py-2.5 text-body-sm text-foreground/90"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: accent }} />
                    {item}
                  </li>
                ))}
              </ul>
              {content.outro && (
                <p className="max-w-[720px] text-body text-muted-foreground leading-relaxed">{content.outro}</p>
              )}
            </div>
          );
        }

        // definitions
        return (
          <div key={i} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {content.defs.map((def, j) => (
              <div key={j} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                  <p className="text-card-title-sm text-foreground">{def.term}</p>
                </div>
                <p className="mt-2 text-body-sm text-muted-foreground">{def.description}</p>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default async function AboutOrcaPage() {
  const [result, siteContent] = await Promise.all([getPageBySlug("aboutorca"), getSiteContent()]);

  if (result.status !== "ok") {
    notFound();
  }

  const sections = groupBlocksIntoSections(result.page.blocks);
  const intro = sections.find((s) => s.heading === null);
  const headedSections = sections.filter((s) => s.heading !== null);

  // Admin metni genelde ilk satira bir "baslik cumlesi" yazip devamini govde
  // metni olarak surduruyor (bkz. aboutorca'daki ilk paragraf blogu). Header'da
  // SADECE sayfa basligi ("Hakkımızda") gorunur - bu ilk satir, altindaki
  // govde paragrafinin kendi basligi olarak sayfa icinde gosterilir.
  const introText = intro?.blocks[0]?.type === "paragraph" && intro.blocks[0].content.mode === "prose"
    ? intro.blocks[0].content.text
    : null;
  const introLines = introText?.split("\n").map((l) => l.trim()).filter(Boolean) ?? [];
  const introHeading = introLines[0] && introLines[0].length <= 100 ? introLines[0] : null;
  const introBody = introHeading ? introLines.slice(1).join("\n") : introText;

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <HeroBackground imageSrc={siteContent.heroImageUrl ?? undefined} fill />
        <div className="relative mx-auto max-w-[900px] px-4 py-20 text-center sm:px-6 sm:py-28">
          <h1 className="text-display-md text-foreground">{result.page.title}</h1>
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
        {(introHeading || introBody) && (
          <div className="mx-auto max-w-[760px] border-b border-border py-14 text-center">
            {introHeading && <h2 className="text-h2 text-foreground">{introHeading}</h2>}
            {introBody && (
              <p className="mt-4 whitespace-pre-line text-body-lg text-muted-foreground">{introBody}</p>
            )}
          </div>
        )}
        {headedSections.map((section, i) => {
          const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
          return (
            <section key={i} className="border-b border-border py-14 last:border-b-0">
              <div className="mb-6 flex items-center gap-3">
                <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                <h2 className={headingClass(section.heading!.size)}>{section.heading!.text}</h2>
              </div>
              <SectionContent section={section} accent={accent} />
            </section>
          );
        })}
      </div>

      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-8">
        <CtaBanner
          icon={Sparkles}
          title="ORCA ekosistemine katılmaya hazır mısın?"
          description="Ücretsiz araçları ve topluluğu hemen keşfet, istediğin an eğitim programlarıyla ilerlemene devam et."
          ctaLabel="Hemen Başla"
          ctaHref="/register"
          accent="purple"
        />
      </div>
    </>
  );
}
