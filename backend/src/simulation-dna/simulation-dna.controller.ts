import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { SimulationDnaService } from './simulation-dna.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
@UseGuards(JwtAuthGuard)
@Controller('simulation-dna')
export class SimulationDnaController {
  constructor(private readonly simulationDnaService: SimulationDnaService) {}
  @Get('me')
  findMine(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.simulationDnaService.findMine(userId);
  }
}
