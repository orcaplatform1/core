-- CreateEnum
CREATE TYPE "NewsCategory" AS ENUM ('EXCHANGE_HACK_OR_INSOLVENCY', 'OFFICIAL_MA_ACQUISITION', 'MACRO_SURPRISE', 'VERIFIED_INFLUENCER', 'PARTNERSHIP_INTEGRATION', 'EXCHANGE_LISTING', 'MAINNET_UPGRADE', 'REGULATORY', 'TOKEN_UNLOCK', 'ETF_DECISION', 'UNVERIFIED_OTHER');

-- CreateEnum
CREATE TYPE "NewsDirection" AS ENUM ('LONG', 'SHORT', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "TerminalNewsTradeStatus" AS ENUM ('PENDING_ENTRY', 'OPEN', 'CLOSED', 'FAILED', 'SHADOW_ONLY');

-- CreateTable
CREATE TABLE "TerminalNewsTradeConfig" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "testnet" BOOLEAN NOT NULL DEFAULT true,
    "shadowMode" BOOLEAN NOT NULL DEFAULT true,
    "riskPerTradeUsdt" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "leverage" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerminalNewsTradeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsEvent" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceAccount" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "NewsCategory",
    "direction" "NewsDirection",
    "confidenceScore" DOUBLE PRECISION,
    "tradable" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationNotes" TEXT,
    "aiSummary" TEXT,
    "classifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsTrade" (
    "id" TEXT NOT NULL,
    "newsEventId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" "NewsDirection" NOT NULL,
    "status" "TerminalNewsTradeStatus" NOT NULL DEFAULT 'PENDING_ENTRY',
    "entryOrderId" TEXT,
    "slOrderId" TEXT,
    "entryPrice" DOUBLE PRECISION,
    "qty" DOUBLE PRECISION,
    "pivotStopPrice" DOUBLE PRECISION,
    "entryFilledAt" TIMESTAMP(3),
    "entryLatencyMs" INTEGER,
    "entryLatencyNote" TEXT,
    "closeReason" TEXT,
    "realizedPnl" DOUBLE PRECISION,
    "commission" DOUBLE PRECISION,
    "funding" DOUBLE PRECISION,
    "netPnl" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsEvent_sourceUrl_key" ON "NewsEvent"("sourceUrl");

-- CreateIndex
CREATE INDEX "NewsEvent_publishedAt_idx" ON "NewsEvent"("publishedAt");

-- CreateIndex
CREATE INDEX "NewsEvent_category_idx" ON "NewsEvent"("category");

-- CreateIndex
CREATE UNIQUE INDEX "NewsTrade_newsEventId_key" ON "NewsTrade"("newsEventId");

-- CreateIndex
CREATE INDEX "NewsTrade_status_idx" ON "NewsTrade"("status");

-- CreateIndex
CREATE INDEX "NewsTrade_symbol_idx" ON "NewsTrade"("symbol");

-- AddForeignKey
ALTER TABLE "NewsTrade" ADD CONSTRAINT "NewsTrade_newsEventId_fkey" FOREIGN KEY ("newsEventId") REFERENCES "NewsEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
