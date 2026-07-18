import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { CreateProgramDto } from './dto/create-program.dto';
import { ProgramsService } from './programs.service';

@Controller('programs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgramsController {
  constructor(
    private readonly programsService: ProgramsService,
  ) {}

  @Roles('SUPER_ADMIN', 'STAFF')
  @Get()
  findAll() {
    return this.programsService.findAll();
  }

  @Roles('SUPER_ADMIN', 'STAFF')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.programsService.findById(id);
  }

  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() body: CreateProgramDto) {
    return this.programsService.create(body);
  }
}
