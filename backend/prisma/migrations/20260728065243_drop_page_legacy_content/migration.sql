-- Legacy markdown field, fully backfilled into Page.blocks (see scripts/migrate-legal-pages-to-blocks.ts)
ALTER TABLE "Page" DROP COLUMN "content";
