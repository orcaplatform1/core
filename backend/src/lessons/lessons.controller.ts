import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  findAll() {
    return this.lessonsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any).id;
    return this.lessonsService.findById(userId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  create(@Req() req: Request, @Body() dto: CreateLessonDto) {
    const actorId = (req.user as any).id;
    return this.lessonsService.create(dto, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateLessonDto) {
    const actorId = (req.user as any).id;
    return this.lessonsService.update(id, dto, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.lessonsService.remove(id, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post(':id/resources')
  addResource(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('name') name: string,
    @Body('url') url: string,
  ) {
    const actorId = (req.user as any).id;
    return this.lessonsService.addResource(id, name, url, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete('resources/:resourceId')
  removeResource(@Req() req: Request, @Param('resourceId') resourceId: string) {
    const actorId = (req.user as any).id;
    return this.lessonsService.removeResource(resourceId, actorId);
  }
}
