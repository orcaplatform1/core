-- CreateTable
CREATE TABLE "ScannerConfig" (
    "id" TEXT NOT NULL,
    "orderFlowTestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScannerConfig_pkey" PRIMARY KEY ("id")
);
