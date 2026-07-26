import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroBackground } from "./hero-background";
import { AiMentorPreviewCard } from "./ai-mentor-preview-card";

export interface HeroCta {
  label: string;
  href: string;
}

export interface HeroSocialProof {
  count: string;
  label: string;
}

export function Hero({
  badge,
  title,
  description,
  primaryCta,
  secondaryCta,
  socialProof,
  heroImageSrc,
}: {
  badge?: string;
  title: React.ReactNode;
  description: string;
  primaryCta: HeroCta;
  secondaryCta?: HeroCta;
  socialProof?: HeroSocialProof;
  heroImageSrc?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <HeroBackground imageSrc={heroImageSrc} />

      <div className="relative mx-auto grid max-w-[1440px] grid-cols-1 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          {badge && (
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {badge}
            </span>
          )}
          <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
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

          {socialProof && (
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary/20 text-[10px] font-semibold text-primary"
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                ))}
              </div>
              <div className="text-sm">
                <span className="font-semibold text-foreground">{socialProof.count}</span>{" "}
                <span className="text-muted-foreground">{socialProof.label}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center lg:justify-end">
          <AiMentorPreviewCard size="compact" />
        </div>
      </div>
    </section>
  );
}
