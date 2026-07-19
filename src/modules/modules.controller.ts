import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';

import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';

@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get()
  findAll() {
    return this.modulesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.modulesService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/unlocked')
  async isUnlocked(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).id;
    const unlocked = await this.modulesService.isUnlocked(userId, id);
    return { unlocked };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateModuleDto) {
    return this.modulesService.create(dto);
  }
}
