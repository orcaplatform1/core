ALTER TABLE "AutoTradeConfig" RENAME COLUMN "riskPerTradePct" TO "riskPerTradeUsdt";
ALTER TABLE "AutoTradeConfig" ALTER COLUMN "riskPerTradeUsdt" SET DEFAULT 10;
UPDATE "AutoTradeConfig" SET "riskPerTradeUsdt" = 10 WHERE "riskPerTradeUsdt" = 1;
