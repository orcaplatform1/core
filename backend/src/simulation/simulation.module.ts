import { Module } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { SimulationController } from './simulation.controller';
import { BadgesModule } from '../badges/badges.module';
import { SimulationDnaModule } from '../simulation-dna/simulation-dna.module';
@Module({
  imports: [BadgesModule, SimulationDnaModule],
  controllers: [SimulationController],
  providers: [SimulationService],
})
export class SimulationModule {}
