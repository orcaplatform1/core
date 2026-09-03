import {
  Activity,
  Bitcoin,
  Bot,
  CalendarClock,
  Clock,
  Crown,
  GraduationCap,
  Landmark,
  LineChart,
  MessageSquare,
  Radar,
  Rocket,
  Shield,
  Smile,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Waves,
  Waypoints,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const MARKETING_ICONS: Record<string, LucideIcon> = {
  users: Users,
  "trending-up": TrendingUp,
  clock: Clock,
  "graduation-cap": GraduationCap,
  bot: Bot,
  crown: Crown,
  "line-chart": LineChart,
  activity: Activity,
  "message-square": MessageSquare,
  trophy: Trophy,
  smile: Smile,
  radar: Radar,
  waypoints: Waypoints,
  "calendar-clock": CalendarClock,
  star: Star,
  shield: Shield,
  zap: Zap,
  rocket: Rocket,
  wrench: Wrench,
  bitcoin: Bitcoin,
  landmark: Landmark,
  waves: Waves,
};

export const MARKETING_ICON_KEYS = Object.keys(MARKETING_ICONS);

export function resolveIcon(key?: string | null): LucideIcon {
  return (key && MARKETING_ICONS[key]) || Bot;
}
