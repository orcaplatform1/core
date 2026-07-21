import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  accent?: "primary" | "success" | "warning" | "purple";
}) {
  const accentClasses: Record<string, string> = {
    primary: "bg-primary/18 text-primary ring-1 ring-primary/25",
    success: "bg-success/18 text-success ring-1 ring-success/25",
    warning: "bg-warning/18 text-warning ring-1 ring-warning/25",
    purple: "bg-purple/18 text-purple ring-1 ring-purple/25",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={cn("flex size-9 items-center justify-center rounded-lg", accentClasses[accent])}>
          <Icon className="size-4.5" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground">{value}</span>
      </div>
      {trend && (
        <p
          className={cn(
            "mt-2 text-xs font-medium",
            trend.direction === "up" && "text-success",
            trend.direction === "down" && "text-danger",
            trend.direction === "flat" && "text-muted-foreground"
          )}
        >
          {trend.label}
        </p>
      )}
    </div>
  );
}
