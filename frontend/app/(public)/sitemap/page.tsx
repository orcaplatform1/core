import type { Metadata } from "next";
import Link from "next/link";
import { Home, GraduationCap, Wrench, LifeBuoy, FileText } from "lucide-react";
import { getFooterPages, getSiteContent } from "@/lib/marketing/get-site-content";
import { getPrograms } from "@/lib/marketing/get-programs";
import { PageHero } from "@/components/marketing/page-hero";

export const metadata: Metadata = {
  title: "Site Haritası",
  description: "ORCA platformundaki tüm sayfalara ve bölümlere tek yerden ulaşın.",
};

const SECTIONS: {
  title: string;
  icon: React.ElementType;
  links: { label: string; href: string }[];
}[] = [
  {
    title: "Genel",
    icon: Home,
    links: [
      { label: "Anasayfa", href: "/" },
      { label: "Giriş Yap", href: "/login" },
      { label: "Kayıt Ol", href: "/register" },
      { label: "Topluluk", href: "/community" },
    ],
  },
  {
    title: "Eğitim",
    icon: GraduationCap,
    links: [
      { label: "Tüm Programlar", href: "/programs" },
      { label: "AI Mentor", href: "/mentor" },
      { label: "Canlı Dersler", href: "/live-lessons" },
      { label: "Sertifikalarım", href: "/certificates" },
      { label: "Liderlik Tablosu", href: "/leaderboard" },
      { label: "Rozetler", href: "/badges" },
    ],
  },
  {
    title: "Araçlar",
    icon: Wrench,
    links: [
      { label: "Kripto Araçları", href: "/tools/crypto" },
      { label: "Forex Araçları", href: "/tools/forex" },
      { label: "BIST 100", href: "/tools/bist100" },
      { label: "Ekonomik Takvim", href: "/tools/economic-calendar" },
      { label: "Simülasyon", href: "/simulation" },
      { label: "Backtest", href: "/backtest" },
      { label: "Güçlendiriciler", href: "/enhancers" },
    ],
  },
  {
    title: "Destek",
    icon: LifeBuoy,
    links: [
      { label: "Sıkça Sorulan Sorular", href: "/faq" },
      { label: "Destek Merkezi", href: "/support" },
    ],
  },
];

export default async function SitemapPage() {
  const [legalPages, siteContent, programs] = await Promise.all([
    getFooterPages(),
    getSiteContent(),
    getPrograms(),
  ]);

  return (
    <>
      <PageHero title="Site Haritası" heroImageSrc={siteContent.heroImageUrl ?? undefined} />
      <div className="mx-auto max-w-[800px] px-4 py-16 sm:px-6">
        <p className="text-body-sm text-muted-foreground">
          ORCA platformundaki tüm bölümlere ve sayfalara buradan ulaşabilirsin.
        </p>

        <div className="mt-10 flex flex-col gap-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="mb-3 flex items-center gap-2">
                <section.icon className="size-4 text-primary" />
                <h2 className="text-card-title-sm uppercase text-foreground">{section.title}</h2>
              </div>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block rounded-lg border border-border bg-card px-4 py-2.5 text-navbar text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {programs.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <GraduationCap className="size-4 text-primary" />
                <h2 className="text-card-title-sm uppercase text-foreground">Programlarımız</h2>
              </div>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {programs.map((program) => (
                  <li key={program.id}>
                    <Link
                      href={`/programs/${program.slug ?? program.id}`}
                      className="block rounded-lg border border-border bg-card px-4 py-2.5 text-navbar text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {program.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {legalPages.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <h2 className="text-card-title-sm uppercase text-foreground">Yasal</h2>
              </div>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {legalPages.map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={`/${page.slug}`}
                      className="block rounded-lg border border-border bg-card px-4 py-2.5 text-navbar text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
