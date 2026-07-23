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
import { AddResourceDto } from './dto/add-resource.dto';

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
    const role = (req.user as any).role;
    return this.lessonsService.findById(userId, id, role);
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
    @Body() dto: AddResourceDto,
  ) {
    const actorId = (req.user as any).id;
    return this.lessonsService.addResource(id, dto.name, dto.url, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete('resources/:resourceId')
  removeResource(@Req() req: Request, @Param('resourceId') resourceId: string) {
    const actorId = (req.user as any).id;
    return this.lessonsService.removeResource(resourceId, actorId);
  }
}
