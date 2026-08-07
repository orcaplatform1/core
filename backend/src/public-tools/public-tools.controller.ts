import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CryptoToolsService } from './crypto-tools.service';
import { ForexToolsService } from './forex-tools.service';
import { EconomicToolsService } from './economic-tools.service';
import { BistToolsService } from './bist-tools.service';
import { OnchainToolsService } from './onchain-tools.service';

// Anonim ziyaretciler de erisebilir (2 dakikalik deneme suresi, bkz.
// frontend VisitorTrialGate + backend visitor-trial modulu) - giris yapmis
// kullanicilar (rol/abonelik farketmeksizin) sinirsiz erisir. Kisisellestirme
// gerekmedigi icin OptionalJwtAuthGuard yeterli, req.user hic kullanilmiyor.
@UseGuards(OptionalJwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller('tools')
export class PublicToolsController {
  constructor(
    private readonly cryptoTools: CryptoToolsService,
    private readonly forexTools: ForexToolsService,
    private readonly economicTools: EconomicToolsService,
    private readonly bistTools: BistToolsService,
    private readonly onchainTools: OnchainToolsService,
  ) {}

  @Get('crypto/movers')
  getMovers() {
    return this.cryptoTools.getTopMovers();
  }

  @Get('crypto/heatmap')
  async getHeatmap() {
    const [coins, dominance] = await Promise.all([
      this.cryptoTools.getHeatmap(),
      this.cryptoTools.getDominance(),
    ]);
    return { coins, ...dominance };
  }

  @Get('crypto/funding-rates')
  getFundingRates() {
    return this.cryptoTools.getFundingRates();
  }

  @Get('crypto/fear-greed')
  getFearGreed() {
    return this.cryptoTools.getFearGreed();
  }

  @Get('crypto/liquidation-zones')
  async getLiquidationZones() {
    const zones = await this.cryptoTools.getEstimatedLiquidationZones();
    return { estimated: true, zones };
  }

  @Get('crypto/trending')
  getTrending() {
    return this.cryptoTools.getTrending();
  }

  @Get('crypto/stablecoins')
  getStablecoins() {
    return this.cryptoTools.getStablecoins();
  }

  @Get('crypto/altcoin-season')
  getAltcoinSeason() {
    return this.cryptoTools.getAltcoinSeason();
  }

  @Get('crypto/etf-flows')
  getEtfFlows() {
    return this.cryptoTools.getEtfFlows();
  }

  @Get('forex/quotes')
  getForexQuotes() {
    return this.forexTools.getQuotes();
  }

  @Get('forex/gold-tl')
  getGoldAndTl() {
    return this.forexTools.getGoldAndTl();
  }

  @Get('forex/cot-report')
  getCotReport() {
    return this.forexTools.getCotReport();
  }

  @Get('forex/correlation-matrix')
  getCorrelationMatrix() {
    return this.forexTools.getCorrelationMatrix();
  }

  @Get('economic/indicators')
  async getEconomicIndicators() {
    const indicators = await this.economicTools.getIndicators();
    return { indicators, upcomingFomcMeetings: this.economicTools.getUpcomingFomcMeetings() };
  }

  @Get('bist/index')
  getBistIndex() {
    return this.bistTools.getIndex();
  }

  @Get('bist/stocks')
  getBistStocks() {
    return this.bistTools.getStocks();
  }

  @Get('crypto/onchain')
  getOnchain() {
    return this.onchainTools.getOnchain();
  }
}
