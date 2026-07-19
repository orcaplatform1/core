import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { BacktestService } from './backtest.service';
import { OpenBacktestTradeDto } from './dto/open-backtest-trade.dto';
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
  getCandles(@Query('symbol') symbol: string, @Query('from') from: string, @Query('to') to: string) {
    return this.backtestService.getCandles(symbol, from, to);
  }

  @Post('candles/refresh')
  refreshSymbol(@Body('symbol') symbol: string) {
    return this.backtestService.refreshSymbol(symbol);
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
  closeTrade(@Req() req: Request, @Param('id') id: string, @Body('exitDate') exitDate: string) {
    const userId = (req.user as any).id;
    return this.backtestService.closeTrade(userId, id, exitDate);
  }
}
