export type ProgramLevel = "BASLANGIC" | "ORTA" | "ILERI";
export type Program = {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  level: ProgramLevel | null;
  durationHours: number | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
};
export type CourseModule = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  programId: string;
};
export type LessonSummary = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  durationSeconds: number | null;
  moduleId: string;
};
export type LessonResource = {
  id: string;
  name: string;
  url: string;
};
export type LessonDetail = LessonSummary & {
  videoUrl: string | null;
  pdfUrl: string | null;
  resources: LessonResource[];
  module: CourseModule & { programId: string };
};
export type Enrollment = {
  id: string;
  userId: string;
  programId: string;
  createdAt: string;
};
export type ProgressRow = {
  id: string;
  userId: string;
  programId: string | null;
  moduleId: string | null;
  lessonId: string | null;
  quizId: string | null;
  completed: boolean;
  progress: number;
  watchedSeconds: number;
};
export type Certificate = {
  id: string;
  number: number;
  code: string;
  studentName: string | null;
  issuedAt: string;
};
export type CertificateStatus =
  | { hasCertificate: true; certificate: Certificate }
  | { hasCertificate: false; eligible: boolean; totalPrograms: number; completedPrograms: number };
export type Payment = {
  id: string;
  amount: number;
  currency: string;
  method: "CARD" | "CRYPTO" | "BANK_TRANSFER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  purpose: "PROGRAM" | "MENTOR_CREDITS";
  receiptUrl: string | null;
  createdAt: string;
  approvedAt: string | null;
};
export type MentorMessage = {
  id: string;
  role: "USER" | "MENTOR";
  content: string;
  lessonId: string | null;
  imageUrl: string | null;
  createdAt: string;
};
export type MentorQuota = {
  dailyFreeLimit: number;
  usedToday: number;
  freeRemaining: number;
  mentorCredits: number;
};
export type DiscussedLesson = {
  id: string;
  title: string;
  moduleId: string;
};
export type Notification = {
  id: string;
  type:
    | "NEW_LESSON"
    | "NEW_PROGRAM"
    | "QUIZ_RESULT"
    | "AI_SUGGESTION"
    | "CERTIFICATE_READY"
    | "ANNOUNCEMENT"
    | "LIVE_LESSON_REMINDER"
    | "SYSTEM";
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};
export type BacktestSymbols = { crypto: string[]; forex: string[] };
export type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

// --- Chart Drawing Tools (shared: Backtest + Simulation) ---
export type DrawingTool =
  | "trendline"
  | "horizontal"
  | "vertical"
  | "ray"
  | "rectangle"
  | "ellipse"
  | "fibonacci"
  | "arrow"
  | "note";

// Tools requiring only ONE click to complete (no second point)
export const SINGLE_POINT_TOOLS: DrawingTool[] = ["horizontal", "vertical", "ray", "note"];

export type ChartPoint = { time: number; price: number };

export type ChartShape = {
  id: string;
  tool: DrawingTool;
  p1: ChartPoint;
  p2?: ChartPoint; // undefined for single-point tools
  text?: string; // used by "note" tool
  color: string;
  locked: boolean;
};

export type ChartDrawingData = {
  shapes: ChartShape[];
  note: string;
};

// --- Simulation (paper trading) ---
export type SimulationAccount = {
  id: string;
  userId: string;
  balance: number;
};

export type SimulatedTrade = {
  id: string;
  accountId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  quantity: number;
  leverage: number;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number | null;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  closedAt: string | null;
};

// --- Live Lessons ---
export type NextLiveLesson = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  isLive: boolean;
  startsInSeconds: number;
  discordLink: string | null;
} | null;

// --- Badges & Streak ---
export type MyBadge = {
  id: string;
  name: string;
  description: string;
  locked: boolean;
  earnedAt: string | null;
};

export type StreakUpdate = {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  streakGoalDays: number;
};

// --- Simulation DNA Report ---
export type SimulationDnaReport = {
  id: string;
  tradesAnalyzedCount: number;
  pending: boolean;
  riskProfile: string | null;
  psychologyLabel: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  developmentPlan: string | null;
  createdAt: string;
};

// --- Admin: Users ---
export type AdminUserRow = {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  gender: "ERKEK" | "KADIN";
  email: string | null;
  role: "GUEST" | "STUDENT" | "STAFF" | "SUPER_ADMIN";
  toolsSubscription: "NONE" | "ACTIVE" | "EXPIRED";
  createdAt: string;
};

export type AdminUserList = {
  data: AdminUserRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// --- Admin: Payments ---
export type AdminPaymentRow = {
  id: string;
  amount: number;
  currency: string;
  method: "CARD" | "CRYPTO" | "BANK_TRANSFER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  purpose: "PROGRAM" | "MENTOR_CREDITS";
  receiptUrl: string | null;
  createdAt: string;
  approvedAt: string | null;
  user: {
    fullName: string;
    username: string;
    email: string | null;
  };
};

export type AdminPaymentList = {
  data: AdminPaymentRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type Category = {
  id: string;
  name: string;
};
