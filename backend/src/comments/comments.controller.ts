import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReactCommentDto } from './dto/react-comment.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';
import { ReportCommentDto } from './dto/report-comment.dto';
import { EditCommentDto } from './dto/edit-comment.dto';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('lessons/:lessonId/comments')
  list(@Param('lessonId') lessonId: string, @Req() req: Request, @Query('page') page?: string) {
    const userId = (req.user as any).id;
    return this.commentsService.listForLesson(lessonId, userId, page ? parseInt(page, 10) : 1);
  }

  @UseGuards(JwtAuthGuard)
  @Post('lessons/:lessonId/comments')
  create(@Param('lessonId') lessonId: string, @Req() req: Request, @Body() dto: CreateCommentDto) {
    const user = req.user as any;
    return this.commentsService.create(lessonId, user.id, user.role, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/react')
  react(@Param('id') id: string, @Req() req: Request, @Body() dto: ReactCommentDto) {
    const userId = (req.user as any).id;
    return this.commentsService.react(id, userId, dto.type);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/report')
  report(@Param('id') id: string, @Req() req: Request, @Body() dto: ReportCommentDto) {
    const userId = (req.user as any).id;
    return this.commentsService.report(id, userId, dto.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('comments/:id')
  edit(@Param('id') id: string, @Req() req: Request, @Body() dto: EditCommentDto) {
    const userId = (req.user as any).id;
    return this.commentsService.edit(id, userId, dto.content);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Delete('comments/:id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.commentsService.remove(id, user.id, user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Get('manage/comments')
  listForModeration(@Query('status') status?: string) {
    const s = (status as 'PENDING' | 'APPROVED' | 'REJECTED') || 'PENDING';
    return this.commentsService.listForModeration(s);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Get('manage/comments/reports')
  listReports(@Query('page') page?: string) {
    return this.commentsService.listReports(page ? parseInt(page, 10) : 1);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Patch('manage/comments/:id')
  moderate(@Param('id') id: string, @Body() dto: ModerateCommentDto) {
    return this.commentsService.moderate(id, dto.status);
  }
}
