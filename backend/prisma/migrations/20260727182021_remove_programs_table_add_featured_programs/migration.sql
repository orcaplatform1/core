-- AlterTable
ALTER TABLE "SiteContentSettings" DROP COLUMN "programsTableItems",
DROP COLUMN "programsTableTitle",
ADD COLUMN     "featuredProgramIds" JSONB;

