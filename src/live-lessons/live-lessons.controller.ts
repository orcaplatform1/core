import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
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
  @Roles('SUPER_ADMIN', 'STAFF')
  @Post()
  create(@Body() dto: CreateLiveLessonDto) {
    return this.liveLessonsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'STAFF')
  @Get()
  findAll() {
    return this.liveLessonsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'STAFF')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.liveLessonsService.remove(id);
  }
}
