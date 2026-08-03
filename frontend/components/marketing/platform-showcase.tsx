import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlatformShowcaseData } from "@/lib/marketing/site-content-types";

// Gerçek MacBook Pro + iPhone mockup PNG'leri (public/marketing) kullanılır.
// Her iki PNG'de de ekran alanı SEFFAF bir "delik" - admin panelden yüklenen
// görsel bu deliğin arkasına, çerçeve PNG'i ONUN ÜSTÜNE bindirilir. Delik
// koordinatları kaynak PNG'ler üzerinde piksel bazlı alfa-kanalı taramasıyla
// bulundu (bkz. commit notu) - yüzdeye çevrilip aşağıda sabitlendi.
// next/image basePath'i ("/core") bu projede otomatik eklemiyor (bkz.
// default-site-content.ts heroImageUrl) - yol elle "/core/" ile başlıyor.
const MACBOOK_FRAME = "/core/marketing/macbook-frame.png";
const IPHONE_FRAME = "/core/marketing/iphone-frame.png";

// macbook-frame.png (3460x2200) ekran deliği: left 450 top 300 right 3010 bottom 1900
const LAPTOP_SCREEN = { left: 13.0, top: 13.6, width: 74.0, height: 72.7 };
// iphone-frame.png (365x750) ekran deliği: left 15 top 13 right 349 bottom 738
const PHONE_SCREEN = { left: 4.1, top: 1.7, width: 91.5, height: 96.7 };

export function PlatformShowcase({ data }: { data: PlatformShowcaseData }) {
  const { eyebrow, title, description, ctaLabel, ctaHref, imageUrl, phoneImageUrl } = data;

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

        <div className="relative mx-auto flex w-full max-w-[640px] items-end justify-center pr-8 pb-8 sm:pr-12 sm:pb-12">
          {/* MacBook Pro */}
          <div className="relative w-full" style={{ aspectRatio: "3460 / 2200" }}>
            <div
              className="absolute overflow-hidden bg-black"
              style={{
                left: `${LAPTOP_SCREEN.left}%`,
                top: `${LAPTOP_SCREEN.top}%`,
                width: `${LAPTOP_SCREEN.width}%`,
                height: `${LAPTOP_SCREEN.height}%`,
              }}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="ORCA Dashboard" className="h-full w-full object-cover object-top" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0d1220] to-[#05070f] text-xs text-muted-foreground">
                  Dashboard görseli henüz eklenmedi
                </div>
              )}
            </div>
            <Image
              src={MACBOOK_FRAME}
              alt=""
              aria-hidden
              fill
              unoptimized
              className="pointer-events-none z-10 select-none object-contain"
            />
          </div>

          {/* iPhone — laptop'ın sağ altına, biraz daha aşağıda oturacak şekilde bindirilmiş */}
          <div
            className="absolute bottom-[-9%] right-[2%] z-20 w-[24%] min-w-[92px] max-w-[150px]"
            style={{ aspectRatio: "365 / 750" }}
          >
            <div className="relative h-full w-full">
              <div
                className="absolute overflow-hidden bg-black"
                style={{
                  left: `${PHONE_SCREEN.left}%`,
                  top: `${PHONE_SCREEN.top}%`,
                  width: `${PHONE_SCREEN.width}%`,
                  height: `${PHONE_SCREEN.height}%`,
                }}
              >
                {/* iphone-frame.png'nin kamera çentiği ekran deliğinin üst kısmına taşıyor -
                    icerik tam ustten baslarsa (orn. "Merhaba, Sena" basligi) centigin
                    altinda kalip kirpiliyordu. Kucuk bir ust bosluk centigin altina
                    guvenli sekilde iniyor. */}
                <div className="absolute inset-0 pt-[9%]">
                  {phoneImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={phoneImageUrl}
                      alt="ORCA Mobil"
                      className="h-full w-full bg-[#05070f] object-contain object-top"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0d1220] to-[#05070f] p-1 text-center text-[9px] text-muted-foreground">
                      Mobil görsel eklenmedi
                    </div>
                  )}
                </div>
              </div>
              <Image
                src={IPHONE_FRAME}
                alt=""
                aria-hidden
                fill
                unoptimized
                className="pointer-events-none z-10 select-none object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
