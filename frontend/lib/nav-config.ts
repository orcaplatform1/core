import {
  type LucideIcon,
  Home,
  LayoutDashboard,
  Bell,
  GraduationCap,
  Bot,
  LineChart,
  Repeat,
  Radio,
  Dna,
  Award,
  Medal,
  CreditCard,
  User,
  Wrench,
  Trophy,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

export const studentNav: NavSection[] = [
  {
    items: [
      { label: "Anasayfa", href: "/", icon: Home },
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Eğitim",
    items: [
      { label: "Eğitimlerim", href: "/courses", icon: GraduationCap },
      { label: "Yapay Zeka Mentor", href: "/mentor", icon: Bot },
    ],
  },
  {
    title: "Pratik",
    items: [
      { label: "Araçlar", href: "/tools", icon: Wrench },
      { label: "Backtest", href: "/backtest", icon: LineChart },
      { label: "Simülasyon", href: "/simulation", icon: Repeat },
      { label: "Simülasyon DNA", href: "/simulation-dna", icon: Dna },
      { label: "Canlı Dersler", href: "/live-lessons", icon: Radio },
    ],
  },
  {
    title: "Başarılar",
    items: [
      { label: "Sertifikalar", href: "/certificates", icon: Award },
      { label: "Rozetler", href: "/badges", icon: Medal },
      { label: "Liderlik Tablosu", href: "/leaderboard", icon: Trophy },
    ],
  },
  {
    title: "Hesap",
    items: [
      { label: "Bildirimler", href: "/notifications", icon: Bell },
      { label: "Abonelik", href: "/subscription", icon: CreditCard },
      { label: "Profil", href: "/profile", icon: User },
    ],
  },
];

export const adminNav: NavSection[] = [];
