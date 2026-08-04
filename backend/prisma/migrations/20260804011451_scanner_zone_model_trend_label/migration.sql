-- AlterTable
ALTER TABLE "TrackedSignal" ADD COLUMN     "trendLabel" TEXT NOT NULL DEFAULT 'PRO_TREND';

-- CreateIndex
CREATE INDEX "TrackedSignal_trendLabel_idx" ON "TrackedSignal"("trendLabel");
