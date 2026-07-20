-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('PROGRAM', 'MENTOR_CREDITS');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "creditAmount" INTEGER,
ADD COLUMN     "purpose" "PaymentPurpose" NOT NULL DEFAULT 'PROGRAM';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mentorCredits" INTEGER NOT NULL DEFAULT 0;
