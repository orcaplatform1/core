import type { FooterSettingsData, SiteContentSettings } from "./site-content-types";

export const DEFAULT_SITE_CONTENT: SiteContentSettings = {
  headerLogoText: "ORCA",
  headerLogoImageUrl: null,
  navLinks: [
    { label: "Ana Sayfa", href: "/" },
    { label: "Programlar", href: "/programs" },
    { label: "AI Mentor", href: "/mentor" },
    { label: "Araçlar", href: "/manage/scanner" },
    { label: "Topluluk", href: "/programs" },
    { label: "Blog", href: "/blog" },
    { label: "Hakkımızda", href: "/about" },
  ],

  aiMentorLabel: "ORCA AI Mentor",
  aiMentorHref: "/mentor",

  heroBadge: "Yeni Nesil Finans Eğitim Platformu",
  heroTitle: "Piyasayı Anlamak Artık Daha Akıllı.",
  heroDescription:
    "Yapay zeka destekli analiz, profesyonel eğitim ve gerçek piyasa simülasyonları ile trading yolculuğunu üst seviyeye taşı.",
  heroPrimaryCtaLabel: "Keşfetmeye Başla",
  heroPrimaryCtaHref: "/register",
  heroSecondaryCtaLabel: "Tanıtım Videosu",
  heroSecondaryCtaHref: "/programs",
  heroImageUrl: "/core/marketing/orca-hero-whale.webp",

  partnersTitle: "Güvenilen Teknoloji & Veri Ortakları",
  partnersItems: [
    { icon: "line-chart", name: "Binance" },
    { icon: "activity", name: "TradingView" },
    { icon: "trending-up", name: "CoinMarketCap" },
    { icon: "radar", name: "Coinglass" },
    { icon: "zap", name: "NewsAPI" },
    { icon: "waypoints", name: "TradingEconomics" },
  ],

  featuredProgramIds: [
    "cms1o20sk0000krc3ib8ipuvb", // Finans Okuryazarlığı ve Servet Yönetimi
    "cms1o219s002zkrc3ynaag4cb", // Kripto Para ve Blockchain Uzmanlığı
    "cms1o21k6004mkrc3xyzwu1zs", // Borsa İstanbul Uzmanlık Programı
    "cms1o21oz005tkrc3z23myfjl", // Forex Uzmanlık Programı
    "cms1o21t8006kkrc3b5qr0xrp", // Teknik Analiz
    "cms1o227q009gkrc364j9ot48", // ICT Foundations
  ],

  platformShowcase: {
    eyebrow: "Gerçek Platform Deneyimi",
    title: "Tüm İhtiyacın Olan Araçlar Tek Platformda.",
    description: "Analiz et, test et, öğren ve geliş. ORCA ile piyasalarda bir adım önde ol.",
    ctaLabel: "Platformu Keşfet",
    ctaHref: "/register",
    imageUrl: null,
  },

  toolsTitle: "Neden ORCA ?",
  toolsSubtitle:
    "Yapay zeka destekli araçlarımızla piyasayı daha iyi analiz edin, stratejinizi geliştirin ve bir adım önde olun.",
  toolsItems: [
    {
      icon: "radar",
      title: "AI Piyasa Tarayıcı",
      description: "Anlık tarama ile en güçlü setup'ları yakala.",
      href: "/manage/scanner",
      previewKey: "scanner",
    },
    {
      icon: "line-chart",
      title: "Backtest Simulator",
      description: "Stratejini geçmiş veriler üzerinde test et.",
      href: "/backtest",
      previewKey: "backtest",
    },
    {
      icon: "waypoints",
      title: "İleri Simülasyon",
      description: "Gerçek piyasa koşullarında risk almadan öğren.",
      href: "/simulation",
      previewKey: "simulation",
    },
    {
      icon: "calendar-clock",
      title: "Ekonomik Takvim",
      description: "Önemli verileri ve piyasa etkilerini takip et.",
      href: "/programs",
      previewKey: "calendar",
    },
    {
      icon: "activity",
      title: "Canlı Piyasa Analizi",
      description: "AI destekli anlık piyasa analizleri ve yorumlar.",
      href: "/mentor",
      previewKey: "live",
    },
  ],

  communityEnabled: true,
  communityTitle: "Güçlü Topluluk, Gerçek Başarılar",
  communityStats: [
    { icon: "users", value: "0", label: "Topluluk Üyesi", auto: "totalUsers" },
    { icon: "activity", value: "0", label: "Günlük Aktif", auto: "dailyActive" },
    { icon: "trophy", value: "285+", label: "Başarı Hikayesi" },
    { icon: "smile", value: "%98", label: "Memnuniyet Oranı" },
  ],
  communityExtraCount: 12,

  ctaTitle: "Doğru topluluk. Güçlü araçlar. Sınırsız öğrenme.",
  ctaDescription: "ORCA ile finansal geleceğini bugün inşa et.",
  ctaButtonLabel: "Hemen Başla",
  ctaButtonHref: "/register",
  ctaChecklist: [],

  faviconUrl: null,
};

export const DEFAULT_FOOTER_SETTINGS: FooterSettingsData = {
  companyName: "ORCA",
  description:
    "Yapay zeka destekli eğitim, profesyonel araçlar ve güçlü toplulukla yeni nesil finans platformu.",
  contactEmail: null,
  contactPhone: null,
  socialLinks: {
    X: "https://x.com",
    YouTube: "https://youtube.com",
    Instagram: "https://instagram.com",
    Discord: "https://discord.com",
  },
  copyrightText: `© ${new Date().getFullYear()} ORCA. Tüm hakları saklıdır.`,
  platformLinks: [
    { label: "Programlar", href: "/programs" },
    { label: "AI Mentor", href: "/mentor" },
    { label: "Araçlar", href: "/manage/scanner" },
    { label: "Topluluk", href: "/programs" },
    { label: "Blog", href: "/blog" },
    { label: "Güçlendiriciler", href: "/enhancers" },
  ],
  supportLinks: [
    { label: "Sıkça Sorulan Sorular", href: "/faq" },
    { label: "Destek Merkezi", href: "/support" },
    { label: "İletişim", href: "/contact" },
  ],
};
