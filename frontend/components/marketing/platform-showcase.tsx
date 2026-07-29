import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlatformShowcaseData } from "@/lib/marketing/site-content-types";

// Gerçekçi MacBook çerçevesi: admin panelden yüklenen tek bir dashboard PNG'i
// ekrana object-cover ile yerleştirilir (bkz. manage/site-content "Platform Vitrini"
// sekmesi) — tek tek düzenlenebilir sahte kutular yerine.
export function PlatformShowcase({ data }: { data: PlatformShowcaseData }) {
  const { eyebrow, title, description, ctaLabel, ctaHref, imageUrl } = data;

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-[0.85fr_1.15fr]">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-primary">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">{title}</h2>
          <p className="mt-4 text-muted-foreground">{description}</p>
          <Button
            variant="gradient"
            size="lg"
            className="mt-7"
            render={
              <Link href={ctaHref}>
                {ctaLabel} <ArrowRight className="size-4" />
              </Link>
            }
          />
        </div>

        {/* Gerçekçi MacBook çerçevesi */}
        <div className="mx-auto w-full max-w-[640px]">
          <div
            className="rounded-t-[10px] p-[3px] shadow-[0_40px_90px_-25px_rgba(0,0,0,0.65)] sm:rounded-t-[14px] sm:p-[5px]"
            style={{ background: "linear-gradient(180deg, #3a3d44 0%, #1c1e22 100%)" }}
          >
            <div className="relative aspect-[16/10.2] overflow-hidden rounded-[6px] bg-black sm:rounded-[9px]">
              {/* Kamera notch */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
                <div className="mt-1 flex h-[6px] w-[6px] items-center justify-center rounded-full bg-black ring-[3px] ring-black sm:mt-1.5">
                  <span className="size-[2.5px] rounded-full bg-[#141820]" />
                </div>
              </div>

              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="ORCA Dashboard" className="h-full w-full object-cover object-top" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0d1220] to-[#05070f] text-xs text-muted-foreground">
                  Dashboard görseli henüz eklenmedi
                </div>
              )}
            </div>
          </div>

          {/* Alt gövde (klavye tablası) — ekrandan biraz daha geniş, menteşe gölgesiyle */}
          <div className="relative">
            <div
              className="h-[7px] rounded-b-[3px] sm:h-[10px] sm:rounded-b-[4px]"
              style={{ background: "linear-gradient(180deg, #2c2e33 0%, #16171a 100%)" }}
            />
            <div
              className="mx-auto -mt-px h-[3px] w-[106%] rounded-b-2xl sm:h-[5px]"
              style={{ background: "linear-gradient(180deg, #1c1d20 0%, #0a0a0c 100%)" }}
            />
            <div className="mx-auto -mt-px h-[2px] w-[70%] rounded-b-xl bg-black/40 blur-[2px]" />
          </div>
        </div>
      </div>
    </section>
  );
}
