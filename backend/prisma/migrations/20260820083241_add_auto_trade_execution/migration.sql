-- CreateEnum
CREATE TYPE "AutoTradeStatus" AS ENUM ('PENDING_ENTRY', 'OPEN', 'BREAKEVEN_SET', 'CLOSED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "AutoTradeConfig" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "testnet" BOOLEAN NOT NULL DEFAULT true,
    "cryptoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "forexEnabled" BOOLEAN NOT NULL DEFAULT false,
    "riskPerTradePct" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "leverage" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoTradeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoTrade" (
    "id" TEXT NOT NULL,
    "trackedSignalId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" "AutoTradeStatus" NOT NULL DEFAULT 'PENDING_ENTRY',
    "entryOrderId" TEXT,
    "slOrderId" TEXT,
    "tp1OrderId" TEXT,
    "tp2OrderId" TEXT,
    "tp3OrderId" TEXT,
    "entryPrice" DOUBLE PRECISION,
    "qty" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoTrade_trackedSignalId_key" ON "AutoTrade"("trackedSignalId");

-- CreateIndex
CREATE INDEX "AutoTrade_status_idx" ON "AutoTrade"("status");

-- CreateIndex
CREATE INDEX "AutoTrade_symbol_idx" ON "AutoTrade"("symbol");
