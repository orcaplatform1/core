-- CreateEnum
CREATE TYPE "AirdropStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "AirdropDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "Airdrop" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "blockchain" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "logo" TEXT,
    "banner" TEXT,
    "description" TEXT,
    "website" TEXT,
    "twitter" TEXT,
    "discord" TEXT,
    "telegram" TEXT,
    "documentation" TEXT,
    "status" "AirdropStatus" NOT NULL DEFAULT 'UPCOMING',
    "rewardType" TEXT NOT NULL,
    "estimatedReward" TEXT,
    "estimatedValueUSD" DOUBLE PRECISION,
    "difficulty" "AirdropDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "completionTime" TEXT,
    "requiresKYC" BOOLEAN NOT NULL DEFAULT false,
    "requiresWallet" BOOLEAN NOT NULL DEFAULT false,
    "requiresDiscord" BOOLEAN NOT NULL DEFAULT false,
    "requiresTwitter" BOOLEAN NOT NULL DEFAULT false,
    "requiresTelegram" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "snapshotDate" TIMESTAMP(3),
    "claimDate" TIMESTAMP(3),
    "aiScore" INTEGER NOT NULL DEFAULT 50,
    "riskScore" INTEGER NOT NULL DEFAULT 50,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Airdrop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Airdrop_slug_key" ON "Airdrop"("slug");

-- CreateIndex
CREATE INDEX "Airdrop_status_idx" ON "Airdrop"("status");

-- CreateIndex
CREATE INDEX "Airdrop_blockchain_idx" ON "Airdrop"("blockchain");

-- CreateIndex
CREATE INDEX "Airdrop_category_idx" ON "Airdrop"("category");

-- CreateIndex
CREATE INDEX "Airdrop_difficulty_idx" ON "Airdrop"("difficulty");

-- CreateIndex
CREATE INDEX "Airdrop_featured_idx" ON "Airdrop"("featured");

-- CreateIndex
CREATE UNIQUE INDEX "Airdrop_provider_externalId_key" ON "Airdrop"("provider", "externalId");
