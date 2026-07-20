/*
  Warnings:

  - A unique constraint covering the columns `[promoCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "FinancialProfile" AS ENUM ('BASLANGIC', 'ORTA', 'ILERI', 'UZMAN');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "discountApplied" DOUBLE PRECISION,
ADD COLUMN     "promoCodeUsed" TEXT,
ADD COLUMN     "referredByStaffId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "financialProfile" "FinancialProfile",
ADD COLUMN     "promoCode" TEXT,
ADD COLUMN     "referredByStaffId" TEXT;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "financialProfile" "FinancialProfile" NOT NULL,
    "answers" JSONB,
    "staffPromoCode" TEXT,
    "convertedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_phone_key" ON "Lead"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_promoCode_key" ON "User"("promoCode");
