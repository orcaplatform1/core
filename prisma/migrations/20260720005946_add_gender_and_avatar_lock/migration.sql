-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('ERKEK', 'KADIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" "Gender";
