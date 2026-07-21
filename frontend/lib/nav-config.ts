import {
  type LucideIcon,
  LayoutDashboard,
  Bell,
  GraduationCap,
  Bot,
  LineChart,
  Repeat,
  Radio,
  Award,
  Medal,
  CreditCard,
  User,
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
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
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
      { label: "Backtest", href: "/backtest", icon: LineChart },
      { label: "Simülasyon", href: "/simulation", icon: Repeat },
      { label: "Canlı Dersler", href: "/live-lessons", icon: Radio },
    ],
  },
  {
    title: "Başarılar",
    items: [
      { label: "Sertifikalar", href: "/certificates", icon: Award },
      { label: "Rozetler", href: "/badges", icon: Medal },
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
