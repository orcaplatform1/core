-- CreateEnum
CREATE TYPE "DmMessageStatus" AS ENUM ('SENT', 'BLOCKED_PROFANITY', 'BLOCKED_RATE_LIMIT', 'BLOCKED_USER_BLOCKED');

-- CreateTable
CREATE TABLE "DmMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "DmMessageStatus" NOT NULL DEFAULT 'SENT',
    "blockedReason" TEXT,
    "readAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmMessageEdit" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "previousContent" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmMessageEdit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmMessageReport" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmMessageReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DmMessage_senderId_recipientId_createdAt_idx" ON "DmMessage"("senderId", "recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "DmMessage_recipientId_readAt_idx" ON "DmMessage"("recipientId", "readAt");

-- CreateIndex
CREATE INDEX "DmMessage_createdAt_idx" ON "DmMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "DmMessage" ADD CONSTRAINT "DmMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmMessage" ADD CONSTRAINT "DmMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmMessageEdit" ADD CONSTRAINT "DmMessageEdit_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DmMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmMessageReport" ADD CONSTRAINT "DmMessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DmMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmMessageReport" ADD CONSTRAINT "DmMessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
