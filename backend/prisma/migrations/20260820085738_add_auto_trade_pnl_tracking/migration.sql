-- AlterTable
ALTER TABLE "AutoTrade" ADD COLUMN     "closeReason" TEXT,
ADD COLUMN     "entryFilledAt" TIMESTAMP(3),
ADD COLUMN     "realizedPnl" DOUBLE PRECISION;
