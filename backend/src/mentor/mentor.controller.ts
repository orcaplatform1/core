import { Controller, Post, Get, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { MentorService } from './mentor.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('mentor')
export class MentorController {
  constructor(private readonly mentorService: MentorService) {}

  @Post('message')
  sendMessage(@Req() req: Request, @Body() dto: CreateMessageDto) {
    const userId = (req.user as any).id;
    return this.mentorService.sendMessage(userId, dto);
  }

  @Get('history')
  getHistory(@Req() req: Request, @Query('lessonId') lessonId?: string) {
    const userId = (req.user as any).id;
    return this.mentorService.getHistory(userId, lessonId);
  }

  @Get('lessons')
  getDiscussedLessons(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.mentorService.getDiscussedLessons(userId);
  }

  @Get('quota')
  getQuotaStatus(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.mentorService.getQuotaStatus(userId);
  }
}
