import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { SimulationService } from './simulation.service';
import { OpenTradeDto } from './dto/open-trade.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('account')
  getAccount(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.simulationService.getMyAccount(userId);
  }

  @Post('trades')
  openTrade(@Req() req: Request, @Body() dto: OpenTradeDto) {
    const userId = (req.user as any).id;
    return this.simulationService.openTrade(userId, dto);
  }

  @Get('trades')
  getTrades(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.simulationService.getMyTrades(userId);
  }

  @Post('trades/:id/close')
  closeTrade(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any).id;
    return this.simulationService.closeTrade(userId, id);
  }
}
