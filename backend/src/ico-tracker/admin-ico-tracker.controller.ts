import { Body, Controller, Delete, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IcoTrackerService } from './ico-tracker.service';
import { CreateIcoProjectDto } from './dto/create-ico-project.dto';
import { UpdateIcoProjectDto } from './dto/update-ico-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('admin/ico-projects')
export class AdminIcoTrackerController {
  constructor(private readonly icoTracker: IcoTrackerService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateIcoProjectDto) {
    const actorId = (req.user as any).id;
    return this.icoTracker.create(dto, actorId);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateIcoProjectDto) {
    const actorId = (req.user as any).id;
    return this.icoTracker.update(id, dto, actorId);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.icoTracker.remove(id, actorId);
  }
}
