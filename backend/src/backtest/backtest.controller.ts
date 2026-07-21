import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { BacktestService } from './backtest.service';
import { OpenBacktestTradeDto } from './dto/open-backtest-trade.dto';
import { RefreshSymbolDto } from './dto/refresh-symbol.dto';
import { CloseTradeDto } from './dto/close-trade.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('backtest')
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  @Get('symbols')
  getSymbols() {
    return this.backtestService.getSymbols();
  }

  @Get('candles')
  getCandles(
    @Query('symbol') symbol: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('timeframe') timeframe?: string,
  ) {
    return this.backtestService.getCandles(symbol, from, to, timeframe || '1d');
  }

  @Post('candles/refresh')
  refreshSymbol(@Body() dto: RefreshSymbolDto) {
    return this.backtestService.refreshSymbol(dto.symbol, dto.timeframe || '1d');
  }

  @Post('trades')
  openTrade(@Req() req: Request, @Body() dto: OpenBacktestTradeDto) {
    const userId = (req.user as any).id;
    return this.backtestService.openTrade(userId, dto);
  }

  @Get('trades')
  getTrades(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.backtestService.getMyTrades(userId);
  }

  @Post('trades/:id/close')
  closeTrade(@Req() req: Request, @Param('id') id: string, @Body() dto: CloseTradeDto) {
    const userId = (req.user as any).id;
    return this.backtestService.closeTrade(userId, id, dto.exitDate);
  }
}
