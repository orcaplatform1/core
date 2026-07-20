-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dailyGoalLessons" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "weeklyGoalLessons" INTEGER NOT NULL DEFAULT 5;
