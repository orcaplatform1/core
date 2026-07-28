import { cn } from "@/lib/utils";

/** ai-mentor-preview-card.tsx'teki katmanlı mor "premium" glow deseni — hesaplayıcılar gibi
 * ücretsiz ama "premium" hissettirmek istediğimiz araçlarda tekrar kullanılıyor. */
export function PremiumGlowCard({
  title,
  icon: Icon,
  className,
  children,
}: {
  title: React.ReactNode;
  icon: React.ElementType;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none absolute -inset-2 rounded-[24px] bg-purple/15 opacity-70 blur-xl" />
      <div className="relative overflow-hidden rounded-2xl border border-purple/25 bg-card p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple/60 to-transparent" />
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple/12 text-purple">
            <Icon className="size-4" />
          </span>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}
