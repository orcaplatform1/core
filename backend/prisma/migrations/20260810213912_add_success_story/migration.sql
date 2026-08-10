-- CreateEnum
CREATE TYPE "SuccessStoryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "SuccessStory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "SuccessStoryStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessStory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuccessStory_userId_key" ON "SuccessStory"("userId");

-- CreateIndex
CREATE INDEX "SuccessStory_status_idx" ON "SuccessStory"("status");

-- AddForeignKey
ALTER TABLE "SuccessStory" ADD CONSTRAINT "SuccessStory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
