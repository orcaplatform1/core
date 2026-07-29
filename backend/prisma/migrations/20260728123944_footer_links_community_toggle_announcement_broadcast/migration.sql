-- AlterTable
ALTER TABLE "FooterSettings" ADD COLUMN     "platformLinks" JSONB,
ADD COLUMN     "supportLinks" JSONB;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "broadcastId" TEXT;

-- AlterTable
ALTER TABLE "SiteContentSettings" ADD COLUMN     "communityEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AnnouncementBroadcast" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "link" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_broadcastId_idx" ON "Notification"("broadcastId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "AnnouncementBroadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
