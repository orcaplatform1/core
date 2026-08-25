import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BinanceFuturesClientService } from './binance-futures-client.service';
import { AutoTradeService } from './auto-trade.service';
import { ForexAutoTradeService } from './forex-auto-trade.service';

// Otomatik islem (gercek Binance emirleri) acma/kapama ve risk ayarlari -
// SADECE SUPER_ADMIN. "enabled" varsayilan false gelir (bkz. AutoTradeConfig
// modeli) - kullanici win-rate gozlem donemi bitince buradan acacak.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('scanner/auto-trade')
export class AutoTradeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly binance: BinanceFuturesClientService,
    private readonly autoTradeService: AutoTradeService,
    private readonly forexAutoTradeService: ForexAutoTradeService,
  ) {}

  private async getOrCreateConfig() {
    const existing = await this.prisma.autoTradeConfig.findFirst();
    if (existing) return existing;
    return this.prisma.autoTradeConfig.create({ data: {} });
  }

  @Get('config')
  async getConfig() {
    const config = await this.getOrCreateConfig();
    return {
      ...config,
      apiKeyConfigured: this.binance.isConfigured,
      restBase: this.binance.restBase,
    };
  }

  @Patch('config')
  async updateConfig(
    @Body()
    body: Partial<{
      enabled: boolean;
      cryptoEnabled: boolean;
      riskPerTradeUsdt: number;
      leverage: number;
      forexEnabled: boolean;
    }>,
  ) {
    const config = await this.getOrCreateConfig();
    return this.prisma.autoTradeConfig.update({
      where: { id: config.id },
      data: {
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.cryptoEnabled !== undefined ? { cryptoEnabled: body.cryptoEnabled } : {}),
        ...(body.riskPerTradeUsdt !== undefined ? { riskPerTradeUsdt: body.riskPerTradeUsdt } : {}),
        ...(body.leverage !== undefined ? { leverage: body.leverage } : {}),
        // forexMarginUsdt/forexLeverage BILEREK burada yok - kullanici istegi
        // 2026-08-22: "otomatik 250 dolar 1:100 kaldıraç olsun", panelden
        // degistirilebilir degil (bkz. schema.prisma AutoTradeConfig yorumu).
        ...(body.forexEnabled !== undefined ? { forexEnabled: body.forexEnabled } : {}),
      },
    });
  }

  @Get('balance')
  async getBalance() {
    if (!this.binance.isConfigured) return { walletBalance: 0, unrealizedPnl: 0, marginBalance: 0 };
    return this.binance.getAccountBalance();
  }

  @Get('trades')
  async getTrades() {
    return this.prisma.autoTrade.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  }

  @Get('stats')
  async getStats() {
    return this.autoTradeService.getStats();
  }

  @Get('positions')
  async getPositions() {
    return this.autoTradeService.getLivePositions();
  }

  @Get('market-context')
  async getMarketContext(@Query('symbols') symbols?: string) {
    const list = symbols ? symbols.split(',').filter(Boolean) : [];
    return this.autoTradeService.getMarketContext(list);
  }

  @Post(':id/close')
  async closeOne(@Param('id') id: string) {
    await this.autoTradeService.closePosition(id);
    return { closed: true };
  }

  @Post('close-all')
  async closeAll() {
    return this.autoTradeService.closeAllPositions();
  }

  // --- Forex (golge/simule pozisyonlar - bkz. ForexAutoTradeService basi) ---

  @Get('forex/stats')
  async getForexStats() {
    return this.forexAutoTradeService.getStats();
  }

  @Get('forex/positions')
  async getForexPositions() {
    return this.forexAutoTradeService.getLivePositions();
  }

  @Get('forex/market-context')
  async getForexMarketContext(@Query('symbols') symbols?: string) {
    const list = symbols ? symbols.split(',').filter(Boolean) : [];
    return this.forexAutoTradeService.getMarketContext(list);
  }

  @Post('forex/:id/close')
  async closeForexOne(@Param('id') id: string) {
    await this.forexAutoTradeService.closePosition(id);
    return { closed: true };
  }

  @Post('forex/close-all')
  async closeForexAll() {
    return this.forexAutoTradeService.closeAllPositions();
  }
}
