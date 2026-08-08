import Link from "next/link";
import { resolveIcon } from "@/lib/marketing/icon-registry";
import type { WhyOrcaItemData } from "@/lib/marketing/site-content-types";

function WhyOrcaCardItem({ item }: { item: WhyOrcaItemData }) {
  const Icon = resolveIcon(item.icon);
  return (
    <Link
      href={item.href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border transition-transform duration-200 hover:-translate-y-1"
      style={{ backgroundColor: "#0D1728", borderColor: "#223554" }}
    >
      <div
        className="why-orca-badge-glow absolute left-4 top-4 z-10"
        style={{ "--why-orca-glow": item.badgeColor } as React.CSSProperties}
      >
        <span className="rounded-full px-2.5 py-0.5 text-badge font-semibold text-white">{item.badgeLabel}</span>
      </div>

      <div
        className="flex h-40 items-center justify-center"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${item.badgeColor}26 0%, transparent 70%)`,
        }}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <Icon className="size-9" style={{ color: item.badgeColor }} />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-card-title-sm text-foreground">{item.title}</h3>
        <p className="text-body-sm text-muted-foreground">{item.description}</p>
      </div>
    </Link>
  );
}

export function WhyOrca({ title, items }: { title: string; items: WhyOrcaItemData[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
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
