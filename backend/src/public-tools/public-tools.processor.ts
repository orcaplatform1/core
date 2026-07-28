import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CryptoToolsService } from './crypto-tools.service';
import { ForexToolsService } from './forex-tools.service';
import { EconomicToolsService } from './economic-tools.service';
import { BistToolsService } from './bist-tools.service';
import { OnchainToolsService } from './onchain-tools.service';

@Processor('public-tools', { concurrency: 2, lockDuration: 300000 })
export class PublicToolsProcessor extends WorkerHost {
  constructor(
    private readonly cryptoTools: CryptoToolsService,
    private readonly forexTools: ForexToolsService,
    private readonly economicTools: EconomicToolsService,
    private readonly bistTools: BistToolsService,
    private readonly onchainTools: OnchainToolsService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'refresh-ticker':
        return this.cryptoTools.refreshTicker();
      case 'refresh-heatmap':
        return this.cryptoTools.refreshHeatmapAndDominance();
      case 'refresh-sparklines':
        return this.cryptoTools.refreshSparklines();
      case 'refresh-funding':
        return this.cryptoTools.refreshFundingRates();
      case 'refresh-fear-greed':
        return this.cryptoTools.refreshFearGreed();
      case 'refresh-liq-zones':
        return this.cryptoTools.refreshEstimatedLiquidationZones();
      case 'refresh-forex':
        return this.forexTools.refreshQuotes();
      case 'refresh-economic':
        return this.economicTools.refreshIndicators();
      case 'refresh-bist':
        return this.bistTools.refreshBist();
      case 'refresh-gold-tl':
        return this.forexTools.refreshGoldAndTl();
      case 'refresh-cot':
        return this.forexTools.refreshCotReport();
      case 'refresh-correlation':
        return this.forexTools.refreshCorrelationMatrix();
      case 'refresh-trending':
        return this.cryptoTools.refreshTrending();
      case 'refresh-stablecoins':
        return this.cryptoTools.refreshStablecoins();
      case 'refresh-altcoin-season':
        return this.cryptoTools.refreshAltcoinSeason();
      case 'refresh-etf-flows':
        return this.cryptoTools.refreshEtfFlows();
      case 'refresh-onchain':
        return this.onchainTools.refreshOnchain();
      default:
        return null;
    }
  }
}
