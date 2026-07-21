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

export type DrawingTool = "trendline" | "orderblock" | "liquidity";
export type ChartPoint = { time: number; price: number };
export type ChartShape = {
  id: string;
  tool: DrawingTool;
  p1: ChartPoint;
  p2: ChartPoint;
  color: string;
};
export type ChartDrawingData = {
  shapes: ChartShape[];
  note: string;
};
