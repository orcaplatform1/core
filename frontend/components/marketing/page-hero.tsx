import { HeroBackground } from "./hero-background";

// CMS'ten eklenen düz sayfalar (legal/bilgi sayfaları) için ortak banner: Header'ın
// hemen altında, sayfa içeriğinin üstünde. Ana sayfadaki Hero ile aynı görsel dili
// (HeroBackground) kullanır ama CTA/badge içermez — bu sayfalarda o veriler yok.
export function PageHero({
  title,
  heroImageSrc,
}: {
  title: React.ReactNode;
  heroImageSrc?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <HeroBackground imageSrc={heroImageSrc} fill />
      <div className="relative mx-auto max-w-[1440px] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <h1 className="text-display-md text-foreground">
          {title}
        </h1>
      </div>
    </section>
  );
}
