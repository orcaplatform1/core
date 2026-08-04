/*
  Warnings:

  - Added the required column `updatedAt` to the `WhaleAddress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "WhaleCategory" ADD VALUE 'UNKNOWN';

-- AlterTable
ALTER TABLE "WhaleAddress" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rank" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "WhaleAddress_isActive_rank_idx" ON "WhaleAddress"("isActive", "rank");
