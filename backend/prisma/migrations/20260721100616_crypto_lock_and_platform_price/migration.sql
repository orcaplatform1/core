-- CreateEnum
CREATE TYPE "CryptoAsset" AS ENUM ('BTC', 'ETH', 'BNB');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cryptoAmountLocked" DOUBLE PRECISION,
ADD COLUMN     "cryptoAsset" "CryptoAsset",
ADD COLUMN     "cryptoRateLockedAt" TIMESTAMP(3),
ADD COLUMN     "cryptoRateTRY" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "programPriceTRY" DOUBLE PRECISION NOT NULL DEFAULT 4500,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);
