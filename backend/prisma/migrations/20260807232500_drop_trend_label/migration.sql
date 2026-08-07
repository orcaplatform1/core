-- Pro-Trend/Counter-Trend siniflandirmasi artik islevsiz: yeni ICT/SMC
-- stratejileri (buildIctBreakoutRetestSetup, buildForexLiquiditySweepSetup)
-- trendLabel'i her zaman sabit 'PRO_TREND' uretiyor, dinamik hesaplama
-- (eski computeTrendLabel()) zaten daha once kaldirilmisti - COUNTER_TREND
-- artik hicbir zaman olusmuyor. Alan ve ilgili index kaldirilir. Veri kaybi
-- riski yok: her satirin degeri zaten sabit 'PRO_TREND' idi (kullanici onayli).
DROP INDEX "TrackedSignal_trendLabel_idx";

-- AlterTable
ALTER TABLE "TrackedSignal" DROP COLUMN "trendLabel";
