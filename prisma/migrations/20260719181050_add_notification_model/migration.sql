-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_LESSON', 'NEW_PROGRAM', 'QUIZ_RESULT', 'AI_SUGGESTION', 'CERTIFICATE_READY', 'ANNOUNCEMENT', 'LIVE_LESSON_REMINDER', 'SYSTEM');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
