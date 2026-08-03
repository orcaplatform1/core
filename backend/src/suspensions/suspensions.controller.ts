import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SuspensionsService } from './suspensions.service';
import { IssueSuspensionDto } from './dto/issue-suspension.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller()
export class SuspensionsController {
  constructor(private readonly suspensionsService: SuspensionsService) {}

  @Post('manage/users/:id/suspend')
  issue(@Req() req: Request, @Param('id') id: string, @Body() dto: IssueSuspensionDto) {
    const actorId = (req.user as any).id;
    return this.suspensionsService.issue(id, dto.type, dto.days, actorId, dto.reason);
  }

  @Get('manage/users/:id/suspensions')
  history(@Param('id') id: string) {
    return this.suspensionsService.getHistoryForUser(id);
  }

  @Get('manage/suspensions')
  list(@Query('page') page?: string, @Query('type') type?: string) {
    return this.suspensionsService.listAll(
      page ? parseInt(page, 10) : 1,
      20,
      type === 'COMMENT' || type === 'DM' ? type : undefined,
    );
  }
}
