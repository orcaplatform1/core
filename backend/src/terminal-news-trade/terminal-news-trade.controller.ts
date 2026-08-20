import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BinanceFuturesClientService } from '../execution/binance-futures-client.service';
import { XStreamService } from './x-stream.service';
import { NewsClassifierService } from './news-classifier.service';
import { TerminalNewsTradeService } from './terminal-news-trade.service';

// Terminal News Trade acma/kapama ve risk ayarlari - SADECE SUPER_ADMIN.
// "enabled" false, "shadowMode" true varsayilan gelir (bkz.
// TerminalNewsTradeConfig modeli) - kullanici X API erisimini alip golge mod
// verisini gozden gecirdikten sonra buradan gercek/testnet moda gecirir.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('terminal-news-trade')
export class TerminalNewsTradeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly binance: BinanceFuturesClientService,
    private readonly xStream: XStreamService,
    private readonly classifier: NewsClassifierService,
    private readonly service: TerminalNewsTradeService,
  ) {}

  private async getOrCreateConfig() {
    const existing = await this.prisma.terminalNewsTradeConfig.findFirst();
    if (existing) return existing;
    return this.prisma.terminalNewsTradeConfig.create({ data: {} });
  }

  @Get('config')
  async getConfig() {
    const config = await this.getOrCreateConfig();
    return {
      ...config,
      apiKeyConfigured: this.binance.isConfigured,
      xApiConfigured: this.xStream.isConfigured,
      aiConfigured: this.classifier.isConfigured,
      testnetActive: this.binance.testnet,
    };
  }

  @Patch('config')
  async updateConfig(
    @Body() body: Partial<{ enabled: boolean; shadowMode: boolean; riskPerTradeUsdt: number; leverage: number }>,
  ) {
    const config = await this.getOrCreateConfig();
    return this.prisma.terminalNewsTradeConfig.update({
      where: { id: config.id },
      data: {
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.shadowMode !== undefined ? { shadowMode: body.shadowMode } : {}),
        ...(body.riskPerTradeUsdt !== undefined ? { riskPerTradeUsdt: body.riskPerTradeUsdt } : {}),
        ...(body.leverage !== undefined ? { leverage: body.leverage } : {}),
      },
    });
  }

  @Get('events')
  async getEvents(@Query('limit') limit?: string) {
    return this.service.getEvents(limit ? Number(limit) : 100);
  }

  @Get('trades')
  async getTrades() {
    return this.prisma.newsTrade.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { newsEvent: true } });
  }

  @Get('stats')
  async getStats() {
    return this.service.getStats();
  }

  @Get('positions')
  async getPositions() {
    return this.service.getLivePositions();
  }

  @Post(':id/close')
  async closeOne(@Param('id') id: string) {
    await this.service.closePosition(id);
    return { closed: true };
  }

  @Post('close-all')
  async closeAll() {
    return this.service.closeAllPositions();
  }
}
