-- CreateTable
CREATE TABLE "Liquidation" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "usdValue" DOUBLE PRECISION NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Liquidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Liquidation_symbol_occurredAt_idx" ON "Liquidation"("symbol", "occurredAt");

-- CreateIndex
CREATE INDEX "Liquidation_occurredAt_idx" ON "Liquidation"("occurredAt");

