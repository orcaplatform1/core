/*
  Warnings:

  - A unique constraint covering the columns `[quizAttemptId,questionId]` on the table `QuizAnswer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswer_quizAttemptId_questionId_key" ON "QuizAnswer"("quizAttemptId", "questionId");
