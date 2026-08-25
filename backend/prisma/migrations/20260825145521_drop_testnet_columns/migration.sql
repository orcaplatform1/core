-- Testnet destegi komple kaldirildi (2026-08-25) - Binance baglantisi daima mainnet.
ALTER TABLE "AutoTradeConfig" DROP COLUMN "testnet";
ALTER TABLE "TerminalNewsTradeConfig" DROP COLUMN "testnet";
