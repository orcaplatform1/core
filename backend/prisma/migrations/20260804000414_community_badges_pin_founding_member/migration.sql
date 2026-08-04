-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_POST_COMMENT';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_POST_LIKE';

-- AlterTable
ALTER TABLE "CommunityPost" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isFoundingMember" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "CommunityPost_isPinned_idx" ON "CommunityPost"("isPinned");
