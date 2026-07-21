import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Headers } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('price')
  async getPrice() {
    const price = await this.paymentsService.getProgramPrice();
    return { programPriceTRY: price };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('price')
  updatePrice(@Body('programPriceTRY') programPriceTRY: number) {
    return this.paymentsService.updateProgramPrice(programPriceTRY);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: Request, @Body() dto: CreatePaymentDto) {
    const userId = (req.user as any).id;
    return this.paymentsService.create(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.paymentsService.findMine(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.paymentsService.findAll(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post(':id/approve')
  approve(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.paymentsService.approve(id, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post(':id/reject')
  reject(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.paymentsService.reject(id, actorId);
  }

  @Post('webhooks/binance')
  binanceWebhook(@Headers() headers: Record<string, string>, @Body() body: any) {
    const rawBody = JSON.stringify(body);
    return this.paymentsService.handleBinanceWebhook(headers, rawBody, body);
  }

  @Post('webhooks/bybit')
  bybitWebhook(@Headers() headers: Record<string, string>, @Body() body: any) {
    const rawBody = JSON.stringify(body);
    return this.paymentsService.handleBybitWebhook(headers, rawBody, body);
  }
}
