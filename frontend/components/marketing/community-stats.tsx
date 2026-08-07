import { type LucideIcon } from "lucide-react";

export interface CommunityStatItem {
  icon: LucideIcon;
  value: string;
  label: string;
}

export function CommunityStats({
  title,
  stats,
  avatarCount = 6,
  extraCount,
  membersLabel = "Aramıza katılan son üyeler",
}: {
  title: React.ReactNode;
  stats: CommunityStatItem[];
  avatarCount?: number;
  extraCount?: number;
  membersLabel?: string;
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 rounded-3xl border border-border bg-card p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-h2 text-foreground">
            {title}
            <span className="size-2 animate-pulse rounded-full bg-success" />
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <stat.icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-card-title-md text-foreground">{stat.value}</p>
                  <p className="text-body-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0">
          <p className="mb-2 text-body-xs text-muted-foreground">{membersLabel}</p>
          <div className="flex items-center">
            <div className="flex -space-x-2.5">
              {Array.from({ length: avatarCount }).map((_, i) => (
                <span
                  key={i}
                  className="flex size-9 items-center justify-center rounded-full border-2 border-card bg-primary/20 text-badge text-primary"
                >
                  {String.fromCharCode(65 + i)}
                </span>
              ))}
            </div>
            {extraCount && (
              <span className="ml-2 flex size-9 items-center justify-center rounded-full border-2 border-card bg-secondary text-badge text-muted-foreground">
                +{extraCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
