-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneVerificationCode" TEXT,
ADD COLUMN     "phoneVerificationExpires" TIMESTAMP(3),
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
