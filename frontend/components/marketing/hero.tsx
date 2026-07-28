import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroBackground } from "./hero-background";
import { AiMentorPreviewCard } from "./ai-mentor-preview-card";

export interface HeroCta {
  label: string;
  href: string;
}

export function Hero({
  badge,
  title,
  description,
  primaryCta,
  secondaryCta,
  heroImageSrc,
}: {
  badge?: string;
  title: React.ReactNode;
  description: string;
  primaryCta: HeroCta;
  secondaryCta?: HeroCta;
  heroImageSrc?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <HeroBackground imageSrc={heroImageSrc} />

      <div className="relative mx-auto grid max-w-[1440px] grid-cols-1 gap-12 px-4 py-20 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:items-end lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          {badge && (
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {badge}
            </span>
          )}
          <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-sm text-muted-foreground sm:text-base">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              variant="gradient"
              size="lg"
              render={
                <Link href={primaryCta.href}>
                  {primaryCta.label} <ArrowRight className="size-4" />
                </Link>
              }
            />
            {secondaryCta && (
              <Button
                variant="outline"
                size="lg"
                render={
                  <Link href={secondaryCta.href}>
                    <Play className="size-4" /> {secondaryCta.label}
                  </Link>
                }
              />
            )}
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <AiMentorPreviewCard size="compact" className="max-w-[300px]" />
        </div>
      </div>
    </section>
  );
}
