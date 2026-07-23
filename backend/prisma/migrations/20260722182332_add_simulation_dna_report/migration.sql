-- CreateTable
CREATE TABLE "SimulationDnaReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradesAnalyzedCount" INTEGER NOT NULL,
    "pending" BOOLEAN NOT NULL DEFAULT true,
    "riskProfile" TEXT,
    "psychologyLabel" TEXT,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "developmentPlan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationDnaReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SimulationDnaReport_userId_idx" ON "SimulationDnaReport"("userId");

-- AddForeignKey
ALTER TABLE "SimulationDnaReport" ADD CONSTRAINT "SimulationDnaReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
