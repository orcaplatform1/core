-- CreateTable
CREATE TABLE "AnonymousVisitor" (
    "id" TEXT NOT NULL,
    "cookieId" TEXT NOT NULL,
    "firstAccessAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonymousVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousVisitor_cookieId_key" ON "AnonymousVisitor"("cookieId");

-- CreateIndex
CREATE INDEX "AnonymousVisitor_expiresAt_idx" ON "AnonymousVisitor"("expiresAt");
