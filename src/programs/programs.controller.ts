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
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { ProgramsService } from './programs.service';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  findAll() {
    return this.programsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.programsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  create(@Req() req: Request, @Body() body: CreateProgramDto) {
    const actorId = (req.user as any).id;
    return this.programsService.create(body, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: UpdateProgramDto) {
    const actorId = (req.user as any).id;
    return this.programsService.update(id, body, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.programsService.remove(id, actorId);
  }
}
