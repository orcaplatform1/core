import Link from "next/link";
import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CtaBanner({
  icon: Icon,
  title,
  description,
  checklist,
  ctaLabel,
  ctaHref,
  accent = "primary",
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: string;
  checklist?: string[];
  ctaLabel: string;
  ctaHref: string;
  accent?: "primary" | "purple";
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-10 sm:px-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              accent === "purple"
                ? "radial-gradient(120% 140% at 12% 120%, rgba(139,92,246,0.30), transparent 60%)"
                : "radial-gradient(120% 140% at 12% 120%, rgba(59,91,255,0.35), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-5">
            {Icon && (
              <span className="hidden size-14 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary sm:flex">
                <Icon className="size-6" />
              </span>
            )}
            <div>
              <p className="text-xl font-semibold text-foreground sm:text-2xl">{title}</p>
              {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
              {checklist && checklist.length > 0 && (
                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {checklist.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-foreground/90">
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          accent === "purple" ? "text-purple" : "text-primary"
                        )}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <Button
            variant="gradient"
            size="lg"
            className="shrink-0"
            render={
              <Link href={ctaHref}>
                {ctaLabel} <ArrowRight className="size-4" />
              </Link>
            }
          />
        </div>
      </div>
    </section>
  );
}
