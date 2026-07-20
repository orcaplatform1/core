/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('ILKOGRETIM', 'LISE', 'ONLISANS', 'LISANS', 'DOKTORA');

-- CreateEnum
CREATE TYPE "OccupationType" AS ENUM ('OGRENCI', 'ISSIZ', 'SERBEST_MESLEK', 'OZEL_SEKTOR', 'KAMU', 'YONETICI');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "education" "EducationLevel",
ADD COLUMN     "occupation" "OccupationType",
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
