-- AlterTable
ALTER TABLE "TrackedSignal" ADD COLUMN     "entry" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "WhaleAddress" ALTER COLUMN "updatedAt" DROP DEFAULT;
