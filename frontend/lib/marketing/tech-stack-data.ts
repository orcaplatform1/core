import type { IconType } from "react-icons";
import {
  SiNextdotjs,
  SiReact,
  SiTypescript,
  SiNestjs,
  SiPython,
  SiPostgresql,
  SiPrisma,
  SiTailwindcss,
  SiShadcnui,
  SiReacthookform,
  SiZod,
  SiTanstack,
  SiTradingview,
  SiAnthropic,
  SiWeb3Dotjs,
  SiJsonwebtokens,
  SiNginx,
  SiPm2,
  SiGit,
  SiGithub,
} from "react-icons/si";
import { AreaChart, PlayCircle, Command, BellRing, KeyRound, type LucideIcon } from "lucide-react";

export interface TechStackItem {
  name: string;
  description: string;
  icon: IconType | LucideIcon;
  color?: string;
  secondaryIcon?: IconType | LucideIcon;
  secondaryColor?: string;
}

export const TECH_STACK_INTRO =
  "ORCA, yalnızca bir finans eğitim platformu değil; yapay zekâ, otomasyon, modern web teknolojileri ve güvenli ödeme altyapısını bir araya getiren yeni nesil bir finans ekosistemidir. Altyapımızda kullanılan her teknoloji; hız, güvenlik, ölçeklenebilirlik ve kullanıcı deneyimi odaklı olarak özenle seçilmiştir.";

export const TECH_STACK: TechStackItem[] = [
  {
    name: "Next.js",
    description:
      "Platformun kullanıcı arayüzünü oluşturan modern React framework'üdür. Hızlı sayfa geçişleri, yüksek performans ve SEO uyumluluğu sayesinde akıcı bir deneyim sunar.",
    icon: SiNextdotjs,
    color: "#FFFFFF",
  },
  {
    name: "React",
    description:
      "Dinamik ve etkileşimli kullanıcı arayüzlerinin geliştirilmesini sağlayan dünyanın en yaygın frontend teknolojilerinden biridir.",
    icon: SiReact,
    color: "#61DAFB",
  },
  {
    name: "TypeScript",
    description:
      "Kod güvenliğini artıran, büyük ölçekli projelerde sürdürülebilir ve güvenilir geliştirme sağlayan modern programlama dilidir.",
    icon: SiTypescript,
    color: "#3178C6",
  },
  {
    name: "NestJS",
    description:
      "ORCA'nın tüm sunucu tarafı altyapısını yöneten kurumsal seviyede backend framework'üdür. Güçlü API yapısı sayesinde güvenli ve yüksek performanslı servisler sunar.",
    icon: SiNestjs,
    color: "#E0234E",
  },
  {
    name: "Python 3",
    description:
      "Otomasyon süreçleri, veri işleme, yapay zekâ destekli servisler, arka plan görevleri ve gelecekteki analiz sistemlerinin geliştirilmesinde kullanılan güçlü programlama dilidir. ORCA'nın birçok akıllı özelliğinin temel yapı taşlarından biridir.",
    icon: SiPython,
    color: "#3776AB",
  },
  {
    name: "PostgreSQL",
    description:
      "Kullanıcılar, eğitimler, ödemeler ve platform verileri için yüksek güvenilirlik ve performans sunan profesyonel ilişkisel veritabanıdır.",
    icon: SiPostgresql,
    color: "#4169E1",
  },
  {
    name: "Prisma ORM",
    description: "Veritabanı işlemlerini daha güvenli, hızlı ve sürdürülebilir hale getiren modern ORM altyapısıdır.",
    icon: SiPrisma,
    color: "#FFFFFF",
  },
  {
    name: "Tailwind CSS",
    description:
      "Premium kullanıcı arayüzleri geliştirmek için kullanılan modern CSS framework'üdür. Esnek yapısıyla hızlı ve tutarlı tasarımlar oluşturulmasını sağlar.",
    icon: SiTailwindcss,
    color: "#06B6D4",
  },
  {
    name: "shadcn/ui",
    description:
      "Minimalist, erişilebilir ve profesyonel kullanıcı arayüzü bileşenleri sunarak ORCA'nın modern tasarım dilini destekler.",
    icon: SiShadcnui,
    color: "#FFFFFF",
  },
  {
    name: "React Hook Form",
    description: "Yüksek performanslı form yönetimi sağlayarak kullanıcı etkileşimlerini daha hızlı ve sorunsuz hale getirir.",
    icon: SiReacthookform,
    color: "#EC5990",
  },
  {
    name: "Zod",
    description: "Form ve API verilerini doğrulayan güçlü tip güvenliği sistemiyle güvenilir veri akışı sağlar.",
    icon: SiZod,
    color: "#3E67B1",
  },
  {
    name: "TanStack Table",
    description: "Büyük veri kümelerini yüksek performansla görüntülemek ve yönetmek için kullanılan profesyonel tablo altyapısıdır.",
    icon: SiTanstack,
    color: "#FF4154",
  },
  {
    name: "Recharts",
    description: "İlerleme raporları, performans analizleri ve kullanıcı istatistiklerini modern grafiklerle sunar.",
    icon: AreaChart,
  },
  {
    name: "Lightweight Charts",
    description:
      "TradingView tarafından geliştirilen profesyonel finansal grafik motorudur. Analiz ekranları ve Backtest Simülatörü bu teknoloji üzerine kuruludur.",
    icon: SiTradingview,
    color: "#2962FF",
  },
  {
    name: "React Player",
    description: "Video eğitimlerinin yüksek kalite ve performansla oynatılmasını sağlayan medya altyapısıdır.",
    icon: PlayCircle,
  },
  {
    name: "cmdk",
    description: "Platform içerisinde hızlı arama ve komut sistemi sunarak içeriklere saniyeler içinde ulaşılmasını sağlar.",
    icon: Command,
  },
  {
    name: "Sonner",
    description: "Modern bildirim sistemiyle kullanıcıya akıcı ve premium bir geri bildirim deneyimi sunar.",
    icon: BellRing,
  },
  {
    name: "ClaudeAI",
    description:
      "Yapay Zekâ Mentor'un temelini oluşturan gelişmiş üretken yapay zekâ teknolojisidir. Kişiselleştirilmiş öğrenme, analiz, rehberlik ve performans ölçümü deneyimi sağlar.",
    icon: SiAnthropic,
    color: "#D97757",
  },
  {
    name: "Web3",
    description:
      "Merkeziyetsiz teknolojilerle uyumlu altyapımız sayesinde kripto para ödemeleri güvenli, hızlı ve şeffaf şekilde gerçekleştirilebilir. Web3 entegrasyonu, gelecekte dijital varlık tabanlı yeni hizmetleri destekleyecek şekilde ölçeklenebilir olarak tasarlanmıştır.",
    icon: SiWeb3Dotjs,
    color: "#F16822",
  },
  {
    name: "JWT Authentication",
    description: "Modern kimlik doğrulama sistemiyle kullanıcı oturumlarını güvenli şekilde yönetir.",
    icon: SiJsonwebtokens,
    color: "#FB015B",
  },
  {
    name: "bcrypt",
    description: "Kullanıcı şifrelerini endüstri standartlarında şifreleyerek hesap güvenliğini en üst seviyeye taşır.",
    icon: KeyRound,
  },
  {
    name: "Nginx",
    description: "Yüksek trafikte dahi hızlı, kararlı ve güvenli çalışan profesyonel web sunucusudur.",
    icon: SiNginx,
    color: "#009639",
  },
  {
    name: "PM2",
    description: "Sunucu servislerini yöneterek platformun kesintisiz çalışmasını ve maksimum erişilebilirlik sunmasını sağlar.",
    icon: SiPm2,
    color: "#2B037A",
  },
  {
    name: "Git & GitHub",
    description:
      "Sürüm kontrolü, ekip çalışması ve güvenli yazılım geliştirme süreçlerinin temelini oluşturan profesyonel geliştirme araçlarıdır.",
    icon: SiGit,
    color: "#F05032",
    secondaryIcon: SiGithub,
    secondaryColor: "#FFFFFF",
  },
];

export const TECH_STACK_CLOSING = {
  title: "Yapay Zekâ Destekli ve Ölçeklenebilir Mimari",
  description:
    "ORCA'nın altyapısı; Yapay Zekâ Mentor, otomasyon sistemleri, analiz araçları, Backtest Simülatörü, gelişmiş raporlama ve gelecekte eklenecek yeni servisleri destekleyecek şekilde modüler ve ölçeklenebilir olarak tasarlanmıştır. Böylece platform, teknolojik gelişmelere hızla uyum sağlayarak kullanıcılarına uzun yıllar boyunca modern ve güçlü bir deneyim sunmayı hedefler.",
};
