import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LEGENDS } from "@/lib/data/legends";
import { LegendAvatar } from "./legend-avatar";

// 20 kutucuk aynı anda dönen premium-glow-card kullanmaz (performans + görsel
// gürültü); "premium" his sabit mor/mavi aksan + hover ile veriliyor, dönen
// halka efekti yalnızca detay sayfasındaki tek fotoğrafta kullanılıyor.
export function LegendsList() {
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LEGENDS.map((legend) => (
          <Link
            key={legend.slug}
            href={`/legends/${legend.slug}`}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 pr-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-purple/40 hover:shadow-[0_0_24px_-8px_rgba(139,92,246,0.35)]"
          >
            <LegendAvatar name={legend.name} photoUrl={legend.photoUrl} />
            <span className="flex-1 text-card-title-sm text-foreground">{legend.name}</span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-purple" />
          </Link>
        ))}
      </div>
    </div>
  );
}
