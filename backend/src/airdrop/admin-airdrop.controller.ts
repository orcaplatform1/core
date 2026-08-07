import { Body, Controller, Delete, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AirdropService } from './airdrop.service';
import { CreateAirdropDto } from './dto/create-airdrop.dto';
import { UpdateAirdropDto } from './dto/update-airdrop.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('admin/airdrops')
export class AdminAirdropController {
  constructor(private readonly airdropService: AirdropService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateAirdropDto) {
    const actorId = (req.user as any).id;
    return this.airdropService.create(dto, actorId);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateAirdropDto) {
    const actorId = (req.user as any).id;
    return this.airdropService.update(id, dto, actorId);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const actorId = (req.user as any).id;
    return this.airdropService.remove(id, actorId);
  }
}
