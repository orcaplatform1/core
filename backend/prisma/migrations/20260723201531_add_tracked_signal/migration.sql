-- CreateTable
CREATE TABLE "TrackedSignal" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "entryZoneTop" DOUBLE PRECISION NOT NULL,
    "entryZoneBottom" DOUBLE PRECISION NOT NULL,
    "stop" DOUBLE PRECISION NOT NULL,
    "tp1" DOUBLE PRECISION NOT NULL,
    "tp2" DOUBLE PRECISION NOT NULL,
    "tp3" DOUBLE PRECISION NOT NULL,
    "strength" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WATCHING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "TrackedSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackedSignal_status_idx" ON "TrackedSignal"("status");
