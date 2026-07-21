export type QuizSummary = {
  id: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number;
  lessonId: string;
};

export type QuizQuestionAnswer = { id: string; text: string };

export type QuizQuestion = {
  id: string;
  title: string;
  description: string | null;
  answers: QuizQuestionAnswer[];
};

export type QuizForTaking = {
  id: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number;
  lessonId: string;
  questions: QuizQuestion[];
};

export type QuizAttempt = {
  id: string;
  userId: string;
  quizId: string;
  lessonId: string;
  moduleId: string;
  programId: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  percentage: number;
  score: number;
  passed: boolean;
  grade: "FAILED" | "GOOD" | "SUCCESS" | "EXCELLENT" | null;
  expired: boolean;
  startedAt: string;
  endedAt: string | null;
};
