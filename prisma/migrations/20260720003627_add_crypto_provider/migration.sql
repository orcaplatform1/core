-- CreateEnum
CREATE TYPE "CryptoProvider" AS ENUM ('BINANCE', 'OKX', 'BYBIT');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cryptoProvider" "CryptoProvider";
