-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('STAFF', 'STUDENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'REFERRAL_REWARD';
ALTER TYPE "NotificationType" ADD VALUE 'STREAK_REMINDER';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "referralType" "ReferralType",
ADD COLUMN     "referredByUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "periodPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referralCreditsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referredByUserId" TEXT,
ADD COLUMN     "totalPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WeeklyChallengeCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "rewardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyChallengeCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyChallengeCompletion_userId_weekStart_key" ON "WeeklyChallengeCompletion"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "MentorSuggestion_userId_weekStart_key" ON "MentorSuggestion"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByUserId_fkey" FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_referredByUserId_fkey" FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

