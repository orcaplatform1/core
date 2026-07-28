import Link from "next/link";
import { Home, GraduationCap, Wrench, FileText } from "lucide-react";
import { getFooterPages } from "@/lib/marketing/get-site-content";

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
    ],
  },
  {
    title: "Eğitim",
    icon: GraduationCap,
    links: [{ label: "Programlar", href: "/programs" }],
  },
  {
    title: "Araçlar",
    icon: Wrench,
    links: [
      { label: "Kripto Araçları", href: "/tools/crypto" },
      { label: "Forex Araçları", href: "/tools/forex" },
      { label: "BIST 100", href: "/tools/bist100" },
      { label: "Ekonomik Takvim", href: "/tools/economic-calendar" },
    ],
  },
];

export default async function SiteHaritasiPage() {
  const legalPages = await getFooterPages();

  return (
    <div className="mx-auto max-w-[800px] px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Site Haritası</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        ORCA platformundaki tüm bölümlere ve sayfalara buradan ulaşabilirsin.
      </p>

      <div className="mt-10 flex flex-col gap-8">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="mb-3 flex items-center gap-2">
              <section.icon className="size-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{section.title}</h2>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {legalPages.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Yasal</h2>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {legalPages.map((page) => (
                <li key={page.slug}>
                  <Link
                    href={`/${page.slug}`}
                    className="block rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
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
  );
}
