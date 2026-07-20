import { Body, Controller, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ProgressService } from './progress.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('watch')
  updateWatchProgress(@Req() req: Request, @Body() dto: UpdateProgressDto) {
    const userId = (req.user as any).id;
    return this.progressService.updateWatchProgress(userId, dto);
  }

  @Get('me')
  findMine(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.progressService.findMine(userId);
  }

  @Get('lesson/:lessonId')
  findByLesson(@Req() req: Request, @Param('lessonId') lessonId: string) {
    const userId = (req.user as any).id;
    return this.progressService.findByLesson(userId, lessonId);
  }
}
