export type MyStats = {
  locked: boolean;
  unlockMessage: string | null;
  overallScore: number;
  previousWeekScore: number | null;
  educationCompletionRate: number;
  quizSuccessRate: number;
  backtestSuccessRate: number;
  simulationReturnRate: number;
  badgeCount: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoal: { target: number; completed: number };
  weeklyGoal: { target: number; completed: number };
};

export type CategoryBreakdownItem = {
  categoryId: string;
  categoryName: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
};

export type TodayRecommendation = {
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string;
  programId: string;
  estimatedMinutes: number | null;
};

export type DailyQuote = {
  text: string;
  author: string;
  profession: string;
  formatted: string;
};

export type BadgeItem = {
  id: string;
  name: string;
  description: string;
  locked: boolean;
  earnedAt: string | null;
};

export type PnlPoint = { date: string; cumulativePnl: number };
