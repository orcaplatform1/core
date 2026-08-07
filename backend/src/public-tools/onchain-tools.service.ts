import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../cache/redis-cache.service';

export interface OnchainData {
  blockHeight: number | null;
  mempool: { count: number; vsizeMb: number } | null;
  fees: {
    fastestFee: number;
    halfHourFee: number;
    hourFee: number;
    economyFee: number;
    minimumFee: number;
  } | null;
  hashrate: { currentEh: number; difficulty: number } | null;
  activeAddresses24h: number | null;
  txVolume24h: number | null;
  updatedAt: string;
}

const CACHE_KEY = 'tools:crypto:onchain';

@Injectable()
export class OnchainToolsService {
  private readonly logger = new Logger(OnchainToolsService.name);

  constructor(private readonly cache: RedisCacheService) {}

  // mempool.space bu sunucudan erisilemiyor (bkz. whale-tracker.service.ts'teki
  // ayni not) - blockstream.info (blockHeight/mempool) ve blockchain.info
  // (hashrate/difficulty, adres/tx zaten oradan geliyordu) ile degistirildi.
  // Her kaynak KENDI try/catch'i icinde izole - biri patlarsa (network hatasi,
  // 4xx/5xx) sadece o alan null olur, digerleri (Promise.all'daki eski
  // davranisin aksine) etkilenmez.
  private async safeFetchJson(url: string): Promise<any | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  private async safeFetchText(url: string): Promise<string | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  async refreshOnchain(): Promise<void> {
    try {
      const [heightText, feeEstimates, mempool, hashrateSeries, difficultySeries, addressesData, txData] =
        await Promise.all([
          this.safeFetchText('https://blockstream.info/api/blocks/tip/height'),
          this.safeFetchJson('https://blockstream.info/api/fee-estimates'),
          this.safeFetchJson('https://blockstream.info/api/mempool'),
          this.safeFetchJson('https://api.blockchain.info/charts/hash-rate?timespan=2days&format=json'),
          this.safeFetchJson('https://api.blockchain.info/charts/difficulty?timespan=2days&format=json'),
          this.safeFetchJson('https://api.blockchain.info/charts/n-unique-addresses?timespan=2days&format=json'),
          this.safeFetchJson('https://api.blockchain.info/charts/n-transactions?timespan=2days&format=json'),
        ]);

      const blockHeight = heightText !== null ? parseInt(heightText, 10) : null;

      // blockstream.info /api/fee-estimates blok-onay-hedefine gore anahtarlanmis
      // donuyor ({"1":feeRate,"3":...,"6":...,"144":...,"1008":...}) - mempool.space'in
      // hazir {fastestFee,halfHourFee,...} seklinden farkli, burada eslenir.
      const fees = feeEstimates
        ? {
            fastestFee: feeEstimates['1'] ?? feeEstimates['2'] ?? 0,
            halfHourFee: feeEstimates['3'] ?? feeEstimates['1'] ?? 0,
            hourFee: feeEstimates['6'] ?? feeEstimates['3'] ?? 0,
            economyFee: feeEstimates['144'] ?? feeEstimates['6'] ?? 0,
            minimumFee: feeEstimates['1008'] ?? feeEstimates['144'] ?? 0,
          }
        : null;

      // blockchain.info/charts/hash-rate degerleri TH/s cinsinden - EH/s'ye
      // cevirmek icin 1e6'ya bolunur (1 EH/s = 1e6 TH/s).
      const latestHashrateThs = hashrateSeries?.values?.length
        ? hashrateSeries.values[hashrateSeries.values.length - 1].y
        : null;
      const latestDifficulty = difficultySeries?.values?.length
        ? difficultySeries.values[difficultySeries.values.length - 1].y
        : null;

      const payload: OnchainData = {
        blockHeight: Number.isFinite(blockHeight) ? blockHeight : null,
        mempool: mempool
          ? { count: mempool.count ?? 0, vsizeMb: (mempool.vsize ?? 0) / 1_000_000 }
          : null,
        fees,
        hashrate:
          latestHashrateThs !== null || latestDifficulty !== null
            ? {
                currentEh: latestHashrateThs !== null ? latestHashrateThs / 1e6 : 0,
                difficulty: latestDifficulty ?? 0,
              }
            : null,
        activeAddresses24h: addressesData?.values?.length
          ? addressesData.values[addressesData.values.length - 1].y
          : null,
        txVolume24h: txData?.values?.length ? txData.values[txData.values.length - 1].y : null,
        updatedAt: new Date().toISOString(),
      };

      await this.cache.setJson(CACHE_KEY, payload, 900);
    } catch (err) {
      this.logger.warn(`refreshOnchain failed: ${err}`);
    }
  }

  async getOnchain(): Promise<OnchainData | null> {
    return this.cache.getJson<OnchainData>(CACHE_KEY);
  }
}
