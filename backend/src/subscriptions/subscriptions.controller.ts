import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // Guvenlik: bu uc herhangi bir odeme dogrulamasi yapmiyor - girisli HERHANGI
  // bir kullanici dogrudan cagirip kendine ucretsiz (en fazla 12 ay) aktif
  // "tools" abonelik statusu verebiliyordu (payments/payments.service.ts
  // approve akisinda bu servis hic cagrilmiyor, invoicesService.createForPayment
  // gibi bir baglanti yok). Odeme onayi ile bagli olmadigi surece sadece
  // SUPER_ADMIN elle abonelik tanimlayabilir.
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  subscribe(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.subscribe(dto.userId, dto);
  }

  @Get('me')
  findMine(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.subscriptionsService.findMine(userId);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get()
  findAll() {
    return this.subscriptionsService.findAll();
  }

  // Guvenlik: sahiplik kontrolu yoktu (IDOR) - herhangi bir giris yapmis
  // kullanici baska bir kullanicinin abonelik kaydini id ile gorebiliyordu.
  // payments.service.ts findOne'daki ayni desen uygulandi.
  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    const requester = req.user as any;
    return this.subscriptionsService.findOne(id, requester.id, requester.role);
  }

  // Guvenlik: sahiplik kontrolu yoktu (IDOR) - herhangi bir giris yapmis
  // kullanici baska bir kullanicinin abonelik kaydini id'sini bilerek (veya
  // tahmin ederek) IPTAL edebiliyordu (baskasinin ucretli aboneligini
  // sonlandirabiliyordu). Sadece sahibi veya SUPER_ADMIN iptal edebilir.
  @Delete(':id')
  cancel(@Req() req: Request, @Param('id') id: string) {
    const requester = req.user as any;
    return this.subscriptionsService.cancel(id, requester.id, requester.role);
  }
}
