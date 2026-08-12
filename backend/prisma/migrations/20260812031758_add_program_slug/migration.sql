-- AlterTable
ALTER TABLE "Program" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Program_slug_key" ON "Program"("slug");
