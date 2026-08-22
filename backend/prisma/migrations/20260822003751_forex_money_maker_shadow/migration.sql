-- AlterTable
ALTER TABLE "AutoTrade" ADD COLUMN     "market" "AssetType" NOT NULL DEFAULT 'CRYPTO',
ADD COLUMN     "simNotional" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "AutoTradeConfig" ADD COLUMN     "forexLeverage" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "forexMarginUsdt" DOUBLE PRECISION NOT NULL DEFAULT 250;
