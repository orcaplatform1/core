-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "timeLimitMinutes" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "expired" BOOLEAN NOT NULL DEFAULT false;
