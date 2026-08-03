import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // Misafir (GUEST) dahil her giris yapmis kullanici destek talebi acabilir/goruntuleyebilir -
  // asagida rol kisitlamasi yok, sadece JwtAuthGuard var.
  @Post('support/tickets')
  create(@Req() req: Request, @Body() dto: CreateTicketDto) {
    const userId = (req.user as any).id;
    return this.supportService.create(userId, dto);
  }

  @Get('support/tickets')
  listMine(@Req() req: Request, @Query('page') page?: string) {
    const userId = (req.user as any).id;
    return this.supportService.listMine(userId, page ? parseInt(page, 10) : 1);
  }

  @Get('support/tickets/:id')
  getOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.supportService.getOne(id, user.id, user.role);
  }

  @Post('support/tickets/:id/messages')
  reply(@Req() req: Request, @Param('id') id: string, @Body() dto: ReplyTicketDto) {
    const user = req.user as any;
    return this.supportService.reply(id, user.id, user.role, dto.content);
  }

  @UseGuards(RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Get('manage/support')
  listAll(
    @Query('page') page?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.supportService.listAll(page ? parseInt(page, 10) : 1, 20, status, category);
  }

  @UseGuards(RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Patch('manage/support/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.supportService.updateStatus(id, dto.status);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete('manage/support/:id')
  remove(@Param('id') id: string) {
    return this.supportService.remove(id);
  }
}
