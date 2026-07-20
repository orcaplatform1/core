/*
  Warnings:

  - You are about to drop the column `bio` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProgramLevel" AS ENUM ('BASLANGIC', 'ORTA', 'ILERI');

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "durationHours" INTEGER,
ADD COLUMN     "level" "ProgramLevel";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "bio";
