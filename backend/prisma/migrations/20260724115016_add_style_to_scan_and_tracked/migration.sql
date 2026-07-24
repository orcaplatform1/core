-- AlterTable
ALTER TABLE "ScanResult" ADD COLUMN     "style" TEXT NOT NULL DEFAULT 'SWING';

-- AlterTable
ALTER TABLE "TrackedSignal" ADD COLUMN     "style" TEXT NOT NULL DEFAULT 'SWING';
