import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SponsorshipsService } from './sponsorships.service';
import { CreateSponsorshipDto } from './dto/create-sponsorship.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sponsorships')
export class SponsorshipsController {
  constructor(private readonly sponsorshipsService: SponsorshipsService) {}

  @Get('pricing')
  getPricing() {
    return this.sponsorshipsService.getPricing();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: Request, @Body() dto: CreateSponsorshipDto) {
    const userId = (req.user as any).id;
    return this.sponsorshipsService.create(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.sponsorshipsService.findMine(userId);
  }
}
