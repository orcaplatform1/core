import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { BadgesService } from './badges.service';
import { CreateBadgeDto } from './dto/create-badge.dto';
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
  create(@Body() dto: CreateBadgeDto) {
    return this.badgesService.create(dto);
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
  grant(@Body('userId') userId: string, @Param('id') badgeId: string) {
    return this.badgesService.grant(userId, badgeId);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.badgesService.remove(id);
  }
}
