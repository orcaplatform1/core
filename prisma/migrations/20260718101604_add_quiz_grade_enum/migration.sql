/*
  Warnings:

  - The `grade` column on the `QuizAttempt` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "QuizGrade" AS ENUM ('FAILED', 'SUCCESS', 'GOOD', 'EXCELLENT');

-- AlterTable
ALTER TABLE "QuizAttempt" DROP COLUMN "grade",
ADD COLUMN     "grade" "QuizGrade";
