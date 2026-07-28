import Link from "next/link";
import { resolveIcon } from "@/lib/marketing/icon-registry";
import { resolvePartnerBrand } from "@/lib/marketing/partner-brands";
import type { PartnerItemData } from "@/lib/marketing/site-content-types";

function PartnerLogo({ partner }: { partner: PartnerItemData }) {
  const brand = resolvePartnerBrand(partner.name, partner.brandKey);

  if (brand?.path) {
    return (
      <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill={brand.color} aria-hidden>
        <path d={brand.path} />
      </svg>
    );
  }

  if (brand) {
    return (
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold"
        style={{ backgroundColor: `${brand.color}26`, color: brand.color }}
      >
        {partner.name.trim().charAt(0).toUpperCase()}
      </span>
    );
  }

  const Icon = resolveIcon(partner.icon);
  return <Icon className="size-5 shrink-0 text-foreground/70" />;
}

export function PartnersBar({
  title,
  partners,
}: {
  title?: string;
  partners: PartnerItemData[];
}) {
  if (partners.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card px-5 py-6 sm:flex-row sm:justify-between">
        {title && (
          <p className="shrink-0 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-left">
            {title}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
          {partners.map((partner) => {
            const content = (
              <span className="flex items-center gap-2.5 rounded-xl border border-border bg-card-inner px-3.5 py-2 text-sm font-semibold text-foreground/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:text-foreground">
                <PartnerLogo partner={partner} />
                {partner.name}
              </span>
            );
            return partner.href ? (
              <Link key={partner.name} href={partner.href} target="_blank" rel="noopener noreferrer">
                {content}
              </Link>
            ) : (
              <span key={partner.name}>{content}</span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
