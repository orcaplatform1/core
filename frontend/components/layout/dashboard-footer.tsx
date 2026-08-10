import { socialIcons } from "@/components/layout/site-footer";
import { ExternalLink } from "@/components/ui/external-link";
import { DEFAULT_FOOTER_SETTINGS } from "@/lib/marketing/default-site-content";
import type { FooterSettingsData } from "@/lib/marketing/site-content-types";

// Dashboard icin SiteFooter'in tam surumu (platform/destek/yasal sutunlari,
// aciklama metni) degil - sadece yasal uyari, telif ve sosyal medya ikonlari.
// Sutunlu tam footer marketing/genel sayfalara ozel.
export function DashboardFooter({
  footer = DEFAULT_FOOTER_SETTINGS,
}: {
  footer?: FooterSettingsData;
}) {
  const socialLinks = Object.entries(footer.socialLinks ?? {})
    .filter(([label]) => socialIcons[label])
    .map(([label, href]) => ({ label, href, icon: socialIcons[label] }));

  return (
    <footer className="mt-8 border-t border-border px-8 py-6">
      <p className="text-body-xs leading-relaxed text-muted-foreground/70">
        {footer.legalDisclaimer ?? DEFAULT_FOOTER_SETTINGS.legalDisclaimer}
      </p>
      <div className="mt-4 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-footer-copyright text-muted-foreground">{footer.copyrightText}</p>
        {socialLinks.length > 0 && (
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
        )}
      </div>
    </footer>
  );
}
