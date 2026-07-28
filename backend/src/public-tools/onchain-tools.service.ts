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

  async refreshOnchain(): Promise<void> {
    try {
      const [heightRes, feesRes, mempoolRes, hashrateRes, addressesRes, txRes] = await Promise.all([
        fetch('https://mempool.space/api/blocks/tip/height'),
        fetch('https://mempool.space/api/v1/fees/recommended'),
        fetch('https://mempool.space/api/mempool'),
        fetch('https://mempool.space/api/v1/mining/hashrate/3d'),
        fetch('https://api.blockchain.info/charts/n-unique-addresses?timespan=2days&format=json'),
        fetch('https://api.blockchain.info/charts/n-transactions?timespan=2days&format=json'),
      ]);

      const blockHeight = heightRes.ok ? parseInt(await heightRes.text(), 10) : null;
      const fees = feesRes.ok ? await feesRes.json() : null;
      const mempool = mempoolRes.ok ? await mempoolRes.json() : null;
      const hashrateData = hashrateRes.ok ? await hashrateRes.json() : null;
      const addressesData = addressesRes.ok ? await addressesRes.json() : null;
      const txData = txRes.ok ? await txRes.json() : null;

      const payload: OnchainData = {
        blockHeight: Number.isFinite(blockHeight) ? blockHeight : null,
        mempool: mempool
          ? { count: mempool.count ?? 0, vsizeMb: (mempool.vsize ?? 0) / 1_000_000 }
          : null,
        fees: fees
          ? {
              fastestFee: fees.fastestFee,
              halfHourFee: fees.halfHourFee,
              hourFee: fees.hourFee,
              economyFee: fees.economyFee,
              minimumFee: fees.minimumFee,
            }
          : null,
        hashrate: hashrateData
          ? {
              currentEh: (hashrateData.currentHashrate ?? 0) / 1e18,
              difficulty: hashrateData.currentDifficulty ?? 0,
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
