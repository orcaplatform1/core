import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SiteContentService } from './site-content.service';
import { UpdateSiteContentDto } from './dto/update-site-content.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('site-content')
export class SiteContentController {
  constructor(private readonly siteContentService: SiteContentService) {}

  @Get()
  get() {
    return this.siteContentService.get();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch()
  update(@Req() req: Request, @Body() dto: UpdateSiteContentDto) {
    const actorId = (req.user as any).id;
    return this.siteContentService.update(dto, actorId);
  }
}
