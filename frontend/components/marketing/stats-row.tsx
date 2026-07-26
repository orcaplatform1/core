import { type LucideIcon } from "lucide-react";

export interface StatItem {
  icon: LucideIcon;
  value: string;
  trend?: string;
  label: string;
  sublabel?: string;
}

export function StatsRow({ stats }: { stats: StatItem[] }) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <stat.icon className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-foreground">{stat.value}</span>
                {stat.trend && (
                  <span className="rounded-full bg-success/12 px-1.5 py-0.5 text-[11px] font-medium text-success">
                    {stat.trend}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-foreground">{stat.label}</p>
              {stat.sublabel && <p className="text-xs text-muted-foreground">{stat.sublabel}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
