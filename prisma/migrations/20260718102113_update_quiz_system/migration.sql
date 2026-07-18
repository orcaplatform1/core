/*
  Warnings:

  - You are about to drop the column `answerId` on the `QuizAnswer` table. All the data in the column will be lost.
  - Added the required column `selectedAnswerId` to the `QuizAnswer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QuizAnswer" DROP COLUMN "answerId",
ADD COLUMN     "selectedAnswerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "correctAnswers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "percentage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalQuestions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wrongAnswers" INTEGER NOT NULL DEFAULT 0;
