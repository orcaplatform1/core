import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreatePaymentDto) {
    const userId = (req.user as any).id;
    return this.paymentsService.create(userId, dto);
  }

  @Get('me')
  findMine(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.paymentsService.findMine(userId);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.paymentsService.approve(id);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.paymentsService.reject(id);
  }
}
