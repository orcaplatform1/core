import { cn } from "@/lib/utils";

export type ToolAccent = "primary" | "success" | "danger" | "warning" | "purple";

const ACCENT = {
  primary: { badge: "bg-primary/12 text-primary", line: "via-primary/70" },
  success: { badge: "bg-success/12 text-success", line: "via-success/70" },
  danger: { badge: "bg-danger/12 text-danger", line: "via-danger/70" },
  warning: { badge: "bg-warning/12 text-warning", line: "via-warning/70" },
  purple: { badge: "bg-purple/12 text-purple", line: "via-purple/70" },
} as const satisfies Record<ToolAccent, { badge: string; line: string }>;

export function ToolCard({
  title,
  icon: Icon,
  accent = "primary",
  badge,
  className,
  children,
}: {
  title: React.ReactNode;
  icon: React.ElementType;
  accent?: ToolAccent;
  badge?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-transform duration-300 hover:-translate-y-1",
        className,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent", a.line)} />
      <div className="mb-4 flex items-center gap-2.5">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", a.badge)}>
          <Icon className="size-4" />
        </span>
        <h3 className="text-card-title-sm text-foreground">{title}</h3>
        {badge}
      </div>
      {children}
    </div>
  );
}
