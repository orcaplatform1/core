import Image from "next/image";

/**
 * Hero arkaplanı. `imageSrc` verilmediğinde koyu gradient + parçacık placeholder
 * gösterilir; verildiğinde görsel yavaş, sürekli bir zoom-in/zoom-out döngüsüyle
 * (.hero-bg-zoom, bkz. globals.css) "nefes alır" — prefers-reduced-motion'da kapanır.
 */
export function HeroBackground({ imageSrc }: { imageSrc?: string }) {
  return (
    // Mobilde metin/kartlar alt alta dizildiği için section çok uzuyor; görseli
    // o tam yüksekliğe object-cover ile sığdırmaya çalışmak balinayı kadraj dışına
    // itiyordu. Bu yüzden mobilde görsel sabit yükseklikli bir bant, md'de tam kaplama
    // (Hero'nun grid'i de md'de yan yana geçiyor, ikisi aynı breakpoint'te değişmeli).
    <div className="absolute inset-x-0 top-0 h-[420px] overflow-hidden sm:h-[480px] md:inset-0 md:h-auto">
      {imageSrc ? (
        // unoptimized: next/image'ın local optimizer'ı bu projede basePath ("/core")
        // ile birlikte dahili self-fetch yaparken 400 dönüyor; görsel zaten webp/önceden
        // sıkıştırılmış geldiği için optimizer'a ihtiyaç yok.
        // md+ ekranlarda hero içeriği sağda AI Mentor kartıyla paylaşılıyor;
        // object-position'ı 72%'ye çekmek görseli sola kaydırıp balinanın kartın
        // altında kalmasını önlüyor.
        <Image
          src={imageSrc}
          alt=""
          fill
          priority
          unoptimized
          className="hero-bg-zoom object-cover object-[58%_38%] md:object-[72%_38%]"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 72% 28%, rgba(90,124,255,0.35), transparent 55%), " +
              "radial-gradient(circle at 15% 85%, rgba(59,91,255,0.28), transparent 50%), " +
              "linear-gradient(180deg, #0B0F1F 0%, #05070F 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(1.5px 1.5px at 20% 30%, rgba(143,184,255,0.8), transparent), " +
                "radial-gradient(1px 1px at 60% 70%, rgba(143,184,255,0.6), transparent), " +
                "radial-gradient(1.5px 1.5px at 80% 20%, rgba(143,184,255,0.7), transparent), " +
                "radial-gradient(1px 1px at 40% 60%, rgba(143,184,255,0.5), transparent), " +
                "radial-gradient(1.5px 1.5px at 90% 82%, rgba(143,184,255,0.6), transparent), " +
                "radial-gradient(1px 1px at 32% 88%, rgba(143,184,255,0.5), transparent), " +
                "radial-gradient(1.5px 1.5px at 50% 15%, rgba(143,184,255,0.6), transparent)",
            }}
          />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent" />
    </div>
  );
}
