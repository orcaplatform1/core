import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: "primary" | "purple";
}

export function FeatureGrid({
  title,
  subtitle,
  features,
}: {
  title: React.ReactNode;
  subtitle?: string;
  features: FeatureItem[];
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 space-y-2">
        <h2 className="text-3xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {features.map((feature, i) => {
          const accent = feature.accent ?? "primary";
          return (
            <div
              key={feature.title}
              className={cn(
                "rounded-2xl border border-border bg-card p-6 transition-transform duration-200 hover:-translate-y-1",
                i < 3 ? "lg:col-span-2" : "lg:col-span-3"
              )}
            >
              <div
                className={cn(
                  "mb-4 flex size-11 items-center justify-center rounded-xl",
                  accent === "purple" ? "bg-purple/12 text-purple" : "bg-primary/12 text-primary"
                )}
              >
                <feature.icon className="size-5" />
              </div>
              <h3 className="mb-1.5 font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
