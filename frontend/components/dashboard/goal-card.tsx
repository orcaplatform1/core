import { Target } from "lucide-react";

export function GoalCard({
  title,
  target,
  completed,
}: {
  title: string;
  target: number;
  completed: number;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Target className="size-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <span className="text-2xl font-bold text-foreground">
          {completed}/{target}
        </span>
        <span className="text-sm font-medium text-muted-foreground">%{pct}</span>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-secondary">
        <div
          className="h-2 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
