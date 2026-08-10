import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SuccessStoriesService } from './success-stories.service';
import { CreateSuccessStoryDto } from './dto/create-success-story.dto';
import { ModerateSuccessStoryDto } from './dto/moderate-success-story.dto';

@Controller()
export class SuccessStoriesController {
  constructor(private readonly successStoriesService: SuccessStoriesService) {}

  @Get('success-stories')
  listPublic() {
    return this.successStoriesService.listPublic();
  }

  @UseGuards(JwtAuthGuard)
  @Get('success-stories/mine')
  getMine(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.successStoriesService.getMine(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('success-stories')
  submit(@Req() req: Request, @Body() dto: CreateSuccessStoryDto) {
    const userId = (req.user as any).id;
    return this.successStoriesService.submit(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('success-stories/mine')
  removeMine(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.successStoriesService.removeMine(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Get('manage/success-stories')
  listForModeration(@Query('status') status?: string) {
    const s = (status as 'PENDING' | 'APPROVED' | 'REJECTED') || 'PENDING';
    return this.successStoriesService.listForModeration(s);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'SUPER_ADMIN')
  @Patch('manage/success-stories/:id')
  moderate(@Param('id') id: string, @Body() dto: ModerateSuccessStoryDto, @Req() req: Request) {
    const actorId = (req.user as any).id;
    return this.successStoriesService.moderate(id, dto.status, dto.rejectionReason, actorId);
  }
}
