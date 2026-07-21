/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Certificate` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Certificate_userId_programId_key";

-- AlterTable
ALTER TABLE "Certificate" ALTER COLUMN "programId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_key" ON "Certificate"("userId");
