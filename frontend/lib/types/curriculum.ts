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
