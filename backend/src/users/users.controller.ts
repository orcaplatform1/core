import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateIdentityDto } from './dto/admin-update-identity.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { GrantEnrollmentDto } from './dto/grant-enrollment.dto';
import { AdminUpdateProfileDto } from './dto/admin-update-profile.dto';
import { AdjustMentorCreditsDto } from './dto/adjust-mentor-credits.dto';
import { BanUserDto } from './dto/ban-user.dto';

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
  @Get('me/referral-stats')
  getMyReferralStats(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.usersService.getReferralStats(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/blocked')
  getMyBlockedList(@Req() req: Request, @Query('page') page?: string) {
    const userId = (req.user as any).id;
    return this.usersService.getMyBlockedList(userId, page ? parseInt(page) : 1);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/public-profile')
  getPublicProfile(@Req() req: Request, @Param('id') id: string) {
    const viewer = req.user as any;
    return this.usersService.getPublicProfile(id, viewer.id, viewer.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/block')
  blockUser(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any).id;
    return this.usersService.blockUser(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/block')
  unblockUser(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any).id;
    return this.usersService.unblockUser(userId, id);
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
  findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return this.usersService.findAll(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20, search);
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
  @Patch(':id/role')
  updateRole(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const actorId = (req.user as any).id;
    return this.usersService.updateRole(id, dto.role, actorId);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post(':id/enrollments')
  grantEnrollment(@Req() req: Request, @Param('id') id: string, @Body() dto: GrantEnrollmentDto) {
    const actorId = (req.user as any).id;
    return this.usersService.grantEnrollment(id, dto.programId, actorId);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get(':id/detail')
  findFullDetail(@Param('id') id: string) {
    return this.usersService.findFullDetail(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id/profile')
  adminUpdateProfile(@Req() req: Request, @Param('id') id: string, @Body() dto: AdminUpdateProfileDto) {
    const actorId = (req.user as any).id;
    return this.usersService.adminUpdateProfile(id, dto, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id/mentor-credits')
  adjustMentorCredits(@Req() req: Request, @Param('id') id: string, @Body() dto: AdjustMentorCreditsDto) {
    const actorId = (req.user as any).id;
    return this.usersService.adjustMentorCredits(id, dto, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post(':id/ban')
  banUser(@Req() req: Request, @Param('id') id: string, @Body() dto: BanUserDto) {
    const actorId = (req.user as any).id;
    return this.usersService.banUser(id, dto, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post(':id/reset-ban-count')
  resetBanCount(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.usersService.resetBanCount(id, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id/enrollments/:programId')
  revokeEnrollment(@Req() req: Request, @Param('id') id: string, @Param('programId') programId: string) {
    const actorId = (req.user as any).id;
    return this.usersService.revokeEnrollment(id, programId, actorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  adminDeleteUser(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.usersService.adminDeleteUser(id, actorId);
  }
}
