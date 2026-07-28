-- CreateEnum
CREATE TYPE "IcoStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "WhaleCategory" AS ENUM ('EXCHANGE', 'INSTITUTION', 'WHALE');

-- CreateEnum
CREATE TYPE "MovementDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "SentimentLabel" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- AlterTable
ALTER TABLE "FooterSettings" ALTER COLUMN "companyName" SET DEFAULT 'ORCA';

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "blocks" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "visibility" "Role"[] DEFAULT ARRAY[]::"Role"[],
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SiteContentSettings" ALTER COLUMN "headerLogoText" SET DEFAULT 'ORCA';

-- CreateTable
CREATE TABLE "CryptoCalendarEvent" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coins" TEXT[],
    "category" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "hotScore" INTEGER NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IcoProject" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "status" "IcoStatus" NOT NULL,
    "raisedAmountUsd" DOUBLE PRECISION,
    "ratingScore" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "websiteUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IcoProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenUnlockEvent" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "unlockDate" TIMESTAMP(3) NOT NULL,
    "amountUsd" DOUBLE PRECISION,
    "percentOfSupply" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenUnlockEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhaleAddress" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "WhaleCategory" NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'BTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhaleAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhaleBalanceSnapshot" (
    "id" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "balanceSat" BIGINT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhaleBalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhaleMovement" (
    "id" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "txid" TEXT NOT NULL,
    "amountSat" BIGINT NOT NULL,
    "direction" "MovementDirection" NOT NULL,
    "balanceAfterSat" BIGINT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhaleMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "summary" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentimentLabel" "SentimentLabel",
    "sentimentScore" DOUBLE PRECISION,
    "scoredAt" TIMESTAMP(3),

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CryptoCalendarEvent_externalId_key" ON "CryptoCalendarEvent"("externalId");

-- CreateIndex
CREATE INDEX "CryptoCalendarEvent_eventDate_idx" ON "CryptoCalendarEvent"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "IcoProject_externalId_key" ON "IcoProject"("externalId");

-- CreateIndex
CREATE INDEX "IcoProject_status_idx" ON "IcoProject"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TokenUnlockEvent_externalId_key" ON "TokenUnlockEvent"("externalId");

-- CreateIndex
CREATE INDEX "TokenUnlockEvent_unlockDate_idx" ON "TokenUnlockEvent"("unlockDate");

-- CreateIndex
CREATE UNIQUE INDEX "WhaleAddress_address_key" ON "WhaleAddress"("address");

-- CreateIndex
CREATE INDEX "WhaleBalanceSnapshot_addressId_capturedAt_idx" ON "WhaleBalanceSnapshot"("addressId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhaleMovement_txid_key" ON "WhaleMovement"("txid");

-- CreateIndex
CREATE INDEX "WhaleMovement_addressId_detectedAt_idx" ON "WhaleMovement"("addressId", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_url_key" ON "NewsArticle"("url");

-- CreateIndex
CREATE INDEX "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");

-- CreateIndex
CREATE INDEX "NewsArticle_sentimentLabel_idx" ON "NewsArticle"("sentimentLabel");

-- AddForeignKey
ALTER TABLE "WhaleBalanceSnapshot" ADD CONSTRAINT "WhaleBalanceSnapshot_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "WhaleAddress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhaleMovement" ADD CONSTRAINT "WhaleMovement_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "WhaleAddress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
