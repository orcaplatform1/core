import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  findMine(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.notificationsService.findMine(userId);
  }

  @Get('me/unread-count')
  unreadCount(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.notificationsService.unreadCount(userId);
  }

  @Post(':id/read')
  markAsRead(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any).id;
    return this.notificationsService.markAsRead(userId, id);
  }

  @Post('read-all')
  markAllAsRead(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'STAFF')
  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }
}
