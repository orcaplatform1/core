import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { BadgesService } from './badges.service';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { GrantBadgeDto } from './dto/grant-badge.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  create(@Req() req: Request, @Body() dto: CreateBadgeDto) {
    const actorId = (req.user as any).id;
    return this.badgesService.create(dto, actorId);
  }

  @Get()
  findAll() {
    return this.badgesService.findAll();
  }

  @Get('me')
  findMine(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.badgesService.findMine(userId);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post(':id/grant')
  grant(@Req() req: Request, @Body() dto: GrantBadgeDto, @Param('id') badgeId: string) {
    const actorId = (req.user as any).id;
    return this.badgesService.grant(dto.userId, badgeId, actorId);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.badgesService.remove(id, actorId);
  }
}
