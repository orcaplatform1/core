/*
  Warnings:

  - A unique constraint covering the columns `[symbol,timeframe,timestamp]` on the table `HistoricalCandle` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "HistoricalCandle_symbol_timestamp_idx";

-- DropIndex
DROP INDEX "HistoricalCandle_symbol_timestamp_key";

-- AlterTable
ALTER TABLE "HistoricalCandle" ADD COLUMN     "timeframe" TEXT NOT NULL DEFAULT '1d';

-- CreateIndex
CREATE INDEX "HistoricalCandle_symbol_timeframe_timestamp_idx" ON "HistoricalCandle"("symbol", "timeframe", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalCandle_symbol_timeframe_timestamp_key" ON "HistoricalCandle"("symbol", "timeframe", "timestamp");
