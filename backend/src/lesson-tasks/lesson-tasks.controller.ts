import { Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { LessonTasksService } from './lesson-tasks.service';
import { UpsertLessonTaskDto } from './dto/upsert-task.dto';
import { SetTaskProgressDto } from './dto/set-progress.dto';

@Controller('lessons')
export class LessonTasksController {
  constructor(private readonly lessonTasksService: LessonTasksService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':id/task')
  getForLesson(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any).id;
    return this.lessonTasksService.getForLesson(id, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Put(':id/task')
  upsert(@Req() req: Request, @Param('id') id: string, @Body() dto: UpsertLessonTaskDto) {
    const actorId = (req.user as any).id;
    return this.lessonTasksService.upsert(id, dto, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id/task')
  remove(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.lessonTasksService.remove(id, actorId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/task/progress')
  setMyProgress(@Req() req: Request, @Param('id') id: string, @Body() dto: SetTaskProgressDto) {
    const userId = (req.user as any).id;
    return this.lessonTasksService.setMyProgress(id, userId, dto.completedCount);
  }
}
