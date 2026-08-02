-- AlterTable
ALTER TABLE "ScanResult" ADD COLUMN     "market" "AssetType" NOT NULL DEFAULT 'CRYPTO';

-- AlterTable
ALTER TABLE "TrackedSignal" ADD COLUMN     "market" "AssetType" NOT NULL DEFAULT 'CRYPTO';
