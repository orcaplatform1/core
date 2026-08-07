-- DropIndex
DROP INDEX "Airdrop_provider_externalId_key";

-- AlterTable
ALTER TABLE "Airdrop" DROP COLUMN "externalId",
DROP COLUMN "provider",
ADD COLUMN     "adExpiresAt" TIMESTAMP(3),
ADD COLUMN     "isAd" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "IcoProject" ADD COLUMN     "adExpiresAt" TIMESTAMP(3),
ADD COLUMN     "isAd" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Airdrop_isAd_idx" ON "Airdrop"("isAd");

-- CreateIndex
CREATE INDEX "IcoProject_isAd_idx" ON "IcoProject"("isAd");
