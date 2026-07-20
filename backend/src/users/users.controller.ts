import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateIdentityDto } from './dto/admin-update-identity.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMyProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const userId = (req.user as any).id;
    return this.usersService.updateProfile(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/export')
  exportMyData(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.usersService.exportMyData(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/delete')
  requestAccountDeletion(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.usersService.requestAccountDeletion(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.usersService.findAll(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('banned')
  findBanned() {
    return this.usersService.findBanned();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post(':id/unban')
  unban(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.usersService.unban(id, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id/identity')
  adminUpdateIdentity(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: AdminUpdateIdentityDto,
  ) {
    const actorId = (req.user as any).id;
    return this.usersService.adminUpdateIdentity(id, dto.fullName, dto.username, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
