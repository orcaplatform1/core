import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { FooterService } from './footer.service';
import { UpdateFooterDto } from './dto/update-footer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('footer')
export class FooterController {
  constructor(private readonly footerService: FooterService) {}

  @Get()
  get() {
    return this.footerService.get();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch()
  update(@Req() req: Request, @Body() dto: UpdateFooterDto) {
    const actorId = (req.user as any).id;
    return this.footerService.update(dto, actorId);
  }
}
