import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { LiveLessonsService } from './live-lessons.service';
import { CreateLiveLessonDto } from './dto/create-live-lesson.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('live-lessons')
export class LiveLessonsController {
  constructor(private readonly liveLessonsService: LiveLessonsService) {}

  @Get('next')
  getNext() {
    return this.liveLessonsService.getNext();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  create(@Req() req: Request, @Body() dto: CreateLiveLessonDto) {
    const actorId = (req.user as any).id;
    return this.liveLessonsService.create(dto, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get()
  findAll() {
    return this.liveLessonsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.liveLessonsService.remove(id, actorId);
  }
}
