-- CreateTable
CREATE TABLE "LessonTask" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonTaskProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonTaskProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonTask_lessonId_key" ON "LessonTask"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonTaskProgress_userId_taskId_key" ON "LessonTaskProgress"("userId", "taskId");

-- AddForeignKey
ALTER TABLE "LessonTask" ADD CONSTRAINT "LessonTask_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTaskProgress" ADD CONSTRAINT "LessonTaskProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTaskProgress" ADD CONSTRAINT "LessonTaskProgress_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "LessonTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
