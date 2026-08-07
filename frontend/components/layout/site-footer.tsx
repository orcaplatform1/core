import Link from "next/link";
import { X } from "lucide-react";
import { ExternalLink } from "@/components/ui/external-link";
import { DEFAULT_FOOTER_SETTINGS } from "@/lib/marketing/default-site-content";
import type { FooterSettingsData, LegalPageSummary } from "@/lib/marketing/site-content-types";

// lucide-react bu projede YouTube/Instagram/Discord marka ikonlarını içermiyor
// (sadece jenerik ikonlar var) — bu üçü için küçük, sade satır-ikon SVG'ler.
function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M21.6 7.2c-.2-1-1-1.7-1.9-1.9C18 5 12 5 12 5s-6 0-7.7.3c-1 .2-1.7 1-1.9 1.9C2 8.9 2 12 2 12s0 3.1.4 4.8c.2 1 1 1.7 1.9 1.9C6 19 12 19 12 19s6 0 7.7-.3c1-.2 1.7-1 1.9-1.9.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8ZM10 15V9l5 3-5 3Z" />
    </svg>
  );
}
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.9 5.7A16.3 16.3 0 0 0 15 4.5l-.2.4a13 13 0 0 1 3.4 1.3 14.5 14.5 0 0 0-12.4 0 13 13 0 0 1 3.4-1.3L9 4.5a16.3 16.3 0 0 0-3.9 1.2C2.9 9 2.3 12.2 2.5 15.3a16.4 16.4 0 0 0 5 2.5l.7-1.1a10.6 10.6 0 0 1-1.6-.8l.4-.3a11.7 11.7 0 0 0 10 0l.4.3a10.6 10.6 0 0 1-1.6.8l.7 1.1a16.4 16.4 0 0 0 5-2.5c.3-3.5-.6-6.7-2.6-9.6ZM9.3 13.4c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6c.8 0 1.5.7 1.4 1.6 0 .9-.6 1.6-1.4 1.6Zm5.4 0c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6c.8 0 1.4.7 1.4 1.6s-.6 1.6-1.4 1.6Z" />
    </svg>
  );
}

const socialIcons: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  X: X,
  YouTube: YoutubeIcon,
  Instagram: InstagramIcon,
  Discord: DiscordIcon,
};

export function SiteFooter({
  footer = DEFAULT_FOOTER_SETTINGS,
  legalPages = [],
}: {
  footer?: FooterSettingsData;
  legalPages?: LegalPageSummary[];
}) {
  const socialLinks = Object.entries(footer.socialLinks ?? {})
    .filter(([label]) => socialIcons[label])
    .map(([label, href]) => ({ label, href, icon: socialIcons[label] }));
  const [logoFirst, ...logoRest] = footer.companyName.split(" ");
  const baseFooterColumns = [
    { title: "Platform", links: footer.platformLinks?.length ? footer.platformLinks : DEFAULT_FOOTER_SETTINGS.platformLinks! },
    { title: "Destek", links: footer.supportLinks?.length ? footer.supportLinks : DEFAULT_FOOTER_SETTINGS.supportLinks! },
  ];
  const footerColumns = legalPages.length
    ? [
        ...baseFooterColumns,
        {
          title: "Yasal",
          links: legalPages.map((page) => ({ label: page.title, href: `/${page.slug}` })),
        },
      ]
    : baseFooterColumns;

  return (
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <span className="text-lg font-bold text-foreground">
              {logoFirst} <span className="text-primary">{logoRest.join(" ")}</span>
            </span>
            {footer.description && (
              <p className="text-body-sm mt-3 text-muted-foreground max-w-xs">{footer.description}</p>
            )}
          </div>
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-footer-title text-foreground mb-4">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-footer-link text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-body-xs mt-12 border-t border-divider pt-8 leading-relaxed text-muted-foreground/70">
          Yasal Uyarı: Burada yer alan yatırım bilgi, yorum ve tavsiyeleri yatırım danışmanlığı kapsamında değildir.
          Bu görüşler mali durumunuz ile risk ve getiri tercihlerinize uygun olmayabilir. Sadece burada yer alan
          bilgilere dayanılarak yatırım kararı verilmesi beklentilerinize uygun sonuçlar doğurmayabilir. Sitedeki
          verilerin doğruluğu ve kullanımından doğabilecek zararlardan sitemiz sorumlu değildir.
        </p>

        <div className="mt-6 flex flex-col-reverse items-center gap-6 pt-2 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-footer-copyright text-muted-foreground">{footer.copyrightText}</p>
            <Link
              href="/sitemap"
              className="text-footer-copyright text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              Site Haritası
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {socialLinks.map((s) => (
              <ExternalLink
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <s.icon className="size-4" />
              </ExternalLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
