import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DmService } from './dm.service';
import { CreateDmMessageDto } from './dto/create-dm-message.dto';
import { EditDmMessageDto } from './dto/edit-dm-message.dto';
import { ReportDmMessageDto } from './dto/report-dm-message.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class DmController {
  constructor(private readonly dmService: DmService) {}

  @Get('dm/conversations')
  getConversations(@Req() req: Request) {
    return this.dmService.getConversations((req.user as any).id);
  }

  @Get('dm/unread-count')
  getUnreadCount(@Req() req: Request) {
    return this.dmService.getUnreadCount((req.user as any).id);
  }

  @Get('dm/:userId/messages')
  getThread(@Req() req: Request, @Param('userId') userId: string, @Query('page') page?: string) {
    const me = (req.user as any).id;
    return this.dmService.getThread(me, userId, page ? parseInt(page, 10) : 1);
  }

  @Post('dm/:userId/messages')
  send(@Req() req: Request, @Param('userId') userId: string, @Body() dto: CreateDmMessageDto) {
    const me = (req.user as any).id;
    return this.dmService.sendMessage(me, userId, dto.content);
  }

  @Patch('dm/messages/:id')
  edit(@Req() req: Request, @Param('id') id: string, @Body() dto: EditDmMessageDto) {
    const me = (req.user as any).id;
    return this.dmService.editMessage(me, id, dto.content);
  }

  @Post('dm/messages/:id/report')
  report(@Req() req: Request, @Param('id') id: string, @Body() dto: ReportDmMessageDto) {
    const me = (req.user as any).id;
    return this.dmService.reportMessage(me, id, dto.reason);
  }

  @UseGuards(RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Delete('dm/messages/:id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.dmService.deleteMessage(user.id, id, user.role);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('manage/dm/log')
  adminLog(@Query('page') page?: string) {
    return this.dmService.adminListMessages(page ? parseInt(page, 10) : 1);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('manage/dm/blocks')
  adminBlocks(@Query('page') page?: string) {
    return this.dmService.adminListBlockActions(page ? parseInt(page, 10) : 1);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('manage/dm/reports')
  adminReports(@Query('page') page?: string) {
    return this.dmService.adminListReports(page ? parseInt(page, 10) : 1);
  }
}
