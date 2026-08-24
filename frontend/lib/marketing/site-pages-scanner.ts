import fs from "node:fs";
import path from "node:path";

// Site Haritası sayfasindaki (app/(public)/sitemap/page.tsx) "Genel/Eğitim/
// Araçlar/Destek" bolumlerini app/ klasorunu TARAYARAK uretir - yeni bir
// sayfa (page.tsx) eklendiginde kod degisikligi disinda hicbir sey
// yapilmadan otomatik burada da gorunur (kullanici istegi 2026-08-24:
// "otomatik tarayan versiyonu kur"). "Programlarımız" (getPrograms) ve
// "Yasal" (getFooterPages, admin panelden yonetilen Page modeli) bolumleri
// zaten DB'den dinamik geliyordu, bunlara DOKUNULMADI.
//
// Haric tutulanlar (URL'in ILK segmentine gore - route group'lar ((public),
// (dashboard)) URL'e yansimadigi icin burada gorunmuyor): admin/personel
// paneli, kisisel hesap sayfalari (profil/mesajlar/bildirimler/abonelik) ve
// token/parametreyle calisan tek-seferlik islem sayfalari. Auth gerektiren
// ama ORCA'nin eskiden beri kendi site haritasinda tanitim amacli listeledigi
// ozellik sayfalari (mentor, canli dersler, araclar, simulasyon vb.) BUNA
// DAHIL DEGIL - onlar bilerek listelenir (eski elle yazilmis SECTIONS'ta da
// ayni sekilde yer aliyorlardi).
const EXCLUDED_TOP_SEGMENTS = new Set([
  "manage",
  "dashboard",
  "profile",
  "messages",
  "notifications",
  "subscription",
  "courses",
  "sitemap",
  "reset-password",
  "verify",
  "api",
  // Bu 4'u zaten "Yasal" bolumunde ayri, DB tabanli (getFooterPages) olarak
  // listeleniyor - burada da taransaydi ayni sayfalar iki kez gorunurdu.
  "cookie-policy",
  "privacy-policy",
  "distance-sales-agreement",
  "terms-of-service",
]);

// Tam yol bazinda haric tutma (ust segment baska sayfalar icin gerekli
// oldugundan sadece belirli bir ALT sayfayi gizlemek icin) - mentor/credits
// kisisel kredi bakiyesi/satin alma sayfasi, "mentor" sayfasinin kendisi
// yine de listelenir.
const EXCLUDED_EXACT_PATHS = new Set(["/mentor/credits"]);

const PAGE_META: Record<string, { label: string; group: string }> = {
  "/": { label: "Anasayfa", group: "Genel" },
  "/login": { label: "Giriş Yap", group: "Genel" },
  "/register": { label: "Kayıt Ol", group: "Genel" },
  "/community": { label: "Topluluk", group: "Genel" },
  "/aboutorca": { label: "ORCA Hakkında", group: "Genel" },

  "/programs": { label: "Tüm Programlar", group: "Eğitim" },
  "/mentor": { label: "AI Mentor", group: "Eğitim" },
  "/live-lessons": { label: "Canlı Dersler", group: "Eğitim" },
  "/certificates": { label: "Sertifikalarım", group: "Eğitim" },
  "/leaderboard": { label: "Liderlik Tablosu", group: "Eğitim" },
  "/badges": { label: "Rozetler", group: "Eğitim" },
  "/glossary": { label: "Sözlük", group: "Eğitim" },
  "/legends": { label: "Efsaneler", group: "Eğitim" },

  "/tools": { label: "Tüm Araçlar", group: "Araçlar" },
  "/tools/crypto": { label: "Kripto Araçları", group: "Araçlar" },
  "/tools/forex": { label: "Forex Araçları", group: "Araçlar" },
  "/tools/bist100": { label: "BIST 100", group: "Araçlar" },
  "/tools/economic-calendar": { label: "Ekonomik Takvim", group: "Araçlar" },
  "/simulation": { label: "Simülasyon", group: "Araçlar" },
  "/simulation-dna": { label: "Simülasyon DNA", group: "Araçlar" },
  "/backtest": { label: "Backtest", group: "Araçlar" },
  "/enhancers": { label: "Güçlendiriciler", group: "Araçlar" },
  "/tools/crypto/airdrops": { label: "Airdrop Takvimi", group: "Araçlar" },
  "/tools/crypto/calendar": { label: "Kripto Takvimi", group: "Araçlar" },
  "/tools/crypto/ico": { label: "ICO Takvimi", group: "Araçlar" },
  "/tools/crypto/onchain": { label: "On-chain Analiz", group: "Araçlar" },
  "/tools/crypto/order-flow": { label: "Order Flow", group: "Araçlar" },
  "/tools/crypto/sentiment": { label: "Duyarlılık Analizi", group: "Araçlar" },
  "/tools/crypto/sponsor": { label: "Sponsorluk", group: "Araçlar" },
  "/tools/crypto/unlocks": { label: "Token Unlock Takvimi", group: "Araçlar" },
  "/tools/crypto/whales": { label: "Balina Takibi", group: "Araçlar" },

  "/faq": { label: "Sıkça Sorulan Sorular", group: "Destek" },
  "/support": { label: "Destek Merkezi", group: "Destek" },
  "/success-stories": { label: "Başarı Hikayeleri", group: "Destek" },
};

const GROUP_ORDER = ["Genel", "Eğitim", "Araçlar", "Destek", "Diğer"];

function titleize(segment: string): string {
  return segment
    .split("-")
    .map((w) => (w.length ? w.charAt(0).toLocaleUpperCase("tr") + w.slice(1) : w))
    .join(" ");
}

function walk(dir: string, segments: string[], routes: string[][]) {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const hasPage = entries.some((e) => e.isFile() && e.name === "page.tsx");
  if (hasPage) routes.push(segments);

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    // Rota grubu klasoru: "(grup)" URL'e yansimaz, icine yine de bakariz.
    if (name.startsWith("(") && name.endsWith(")")) {
      walk(path.join(dir, name), segments, routes);
      continue;
    }
    // Dinamik segment ([id], [slug]...): gercek deger olmadan gecerli bir
    // link uretilemez, bu alt agaci tamamen atla.
    if (name.startsWith("[")) continue;
    if (name.startsWith("_")) continue;
    walk(path.join(dir, name), [...segments, name], routes);
  }
}

export type ScannedPage = { href: string; label: string; group: string };

export function getScannedSitePages(): ScannedPage[] {
  const appDir = path.join(process.cwd(), "app");
  const routes: string[][] = [];
  walk(appDir, [], routes);

  const pages: ScannedPage[] = routes
    .filter((segments) => !EXCLUDED_TOP_SEGMENTS.has(segments[0]))
    .map((segments) => {
      const href = segments.length ? `/${segments.join("/")}` : "/";
      const meta = PAGE_META[href];
      return {
        href,
        label: meta?.label ?? titleize(segments[segments.length - 1] ?? "Anasayfa"),
        group: meta?.group ?? "Diğer",
      };
    })
    .filter((page) => !EXCLUDED_EXACT_PATHS.has(page.href));

  return pages.sort((a, b) => {
    const gi = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
    if (gi !== 0) return gi;
    return a.href.localeCompare(b.href, "tr");
  });
}

export function getScannedSitePagesByGroup(): { title: string; links: { href: string; label: string }[] }[] {
  const pages = getScannedSitePages();
  const groups = new Map<string, { href: string; label: string }[]>();
  for (const page of pages) {
    if (!groups.has(page.group)) groups.set(page.group, []);
    groups.get(page.group)!.push({ href: page.href, label: page.label });
  }
  return GROUP_ORDER.filter((g) => groups.has(g)).map((title) => ({
    title,
    links: groups.get(title)!,
  }));
}
