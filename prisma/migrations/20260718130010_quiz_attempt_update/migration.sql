/*
  Warnings:

  - Added the required column `lessonId` to the `QuizAttempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `moduleId` to the `QuizAttempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `programId` to the `QuizAttempt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "lessonId" TEXT NOT NULL,
ADD COLUMN     "moduleId" TEXT NOT NULL,
ADD COLUMN     "programId" TEXT NOT NULL;
