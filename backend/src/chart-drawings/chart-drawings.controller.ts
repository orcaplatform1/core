import { Controller, Get, Post, Delete, Body, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ChartDrawingsService } from './chart-drawings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('chart-drawings')
export class ChartDrawingsController {
  constructor(private readonly chartDrawingsService: ChartDrawingsService) {}

  @Post()
  save(
    @Req() req: Request,
    @Body('symbol') symbol: string,
    @Body('context') context: string,
    @Body('drawings') drawings: any,
  ) {
    const userId = (req.user as any).id;
    return this.chartDrawingsService.save(userId, symbol, context, drawings);
  }

  @Get()
  get(@Req() req: Request, @Query('symbol') symbol: string, @Query('context') context: string) {
    const userId = (req.user as any).id;
    return this.chartDrawingsService.get(userId, symbol, context);
  }

  @Delete()
  remove(@Req() req: Request, @Query('symbol') symbol: string, @Query('context') context: string) {
    const userId = (req.user as any).id;
    return this.chartDrawingsService.remove(userId, symbol, context);
  }
}
