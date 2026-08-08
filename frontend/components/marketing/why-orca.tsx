import Link from "next/link";
import { resolveIcon } from "@/lib/marketing/icon-registry";
import type { WhyOrcaItemData } from "@/lib/marketing/site-content-types";

function WhyOrcaCardItem({ item }: { item: WhyOrcaItemData }) {
  const Icon = resolveIcon(item.icon);
  return (
    <Link
      href={item.href}
      className="why-orca-card-accent group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1"
      style={{ backgroundColor: "#0D1728", borderColor: "#223554", "--why-orca-glow": item.badgeColor } as React.CSSProperties}
    >
      <div className="why-orca-badge-glow absolute left-4 top-4 z-10">
        <span className="rounded-full px-2.5 py-0.5 text-badge font-semibold text-white">{item.badgeLabel}</span>
      </div>

      <div
        className="relative flex h-40 items-center justify-center"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${item.badgeColor}26 0%, transparent 70%)`,
        }}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <Icon className="size-9" style={{ color: item.badgeColor }} />
        )}
        {/* Baslik kapak gorselinin/ikon alaninin arkasina kadar uzaniyor - kart
            gorseli seffaf bir "capsiyon" gibi ustune biniyor, aciklama ise
            gorselin DISINDA, altta kalan duz alanda. Okunabilirlik icin altta
            koyu bir scrim var (hem resim hem ikon-glow arka planinda gecerli). */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent px-4 pb-3 pt-8">
          <h3 className="text-card-title-sm text-white">{item.title}</h3>
        </div>
      </div>

      <div className="px-4 py-3.5">
        <p className="line-clamp-2 text-body-sm text-muted-foreground">{item.description}</p>
      </div>
    </Link>
  );
}

export function WhyOrca({ title, items }: { title: string; items: WhyOrcaItemData[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h2 className="text-h2 text-foreground">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <WhyOrcaCardItem key={item.slug} item={item} />
        ))}
      </div>
    </section>
  );
}
