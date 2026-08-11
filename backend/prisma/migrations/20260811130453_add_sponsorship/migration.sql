-- CreateEnum
CREATE TYPE "SponsorshipType" AS ENUM ('ICO', 'AIRDROP');

-- CreateEnum
CREATE TYPE "SponsorshipStatus" AS ENUM ('AWAITING_PAYMENT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "CryptoAsset" ADD VALUE 'USDT';

-- AlterEnum
ALTER TYPE "PaymentPurpose" ADD VALUE 'SPONSORSHIP';

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "sponsorshipPrice15dUSD" DOUBLE PRECISION NOT NULL DEFAULT 250,
ADD COLUMN     "sponsorshipPrice30dUSD" DOUBLE PRECISION NOT NULL DEFAULT 400,
ADD COLUMN     "sponsorshipPrice7dUSD" DOUBLE PRECISION NOT NULL DEFAULT 150;

-- CreateTable
CREATE TABLE "Sponsorship" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SponsorshipType" NOT NULL,
    "status" "SponsorshipStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "durationDays" INTEGER NOT NULL,
    "priceUsd" DOUBLE PRECISION NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactTelegram" TEXT,
    "formData" JSONB NOT NULL,
    "paymentId" TEXT,
    "createdIcoId" TEXT,
    "createdAirdropId" TEXT,
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsorship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sponsorship_paymentId_key" ON "Sponsorship"("paymentId");

-- CreateIndex
CREATE INDEX "Sponsorship_status_idx" ON "Sponsorship"("status");

-- CreateIndex
CREATE INDEX "Sponsorship_userId_idx" ON "Sponsorship"("userId");

-- AddForeignKey
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
