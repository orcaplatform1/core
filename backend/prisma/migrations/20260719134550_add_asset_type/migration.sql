-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('CRYPTO', 'FOREX');

-- AlterTable
ALTER TABLE "HistoricalCandle" ADD COLUMN     "assetType" "AssetType" NOT NULL DEFAULT 'CRYPTO';
