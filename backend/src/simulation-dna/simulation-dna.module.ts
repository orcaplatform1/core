import { Module } from '@nestjs/common';
import { SimulationDnaService } from './simulation-dna.service';
import { SimulationDnaController } from './simulation-dna.controller';
@Module({
  controllers: [SimulationDnaController],
  providers: [SimulationDnaService],
  exports: [SimulationDnaService],
})
export class SimulationDnaModule {}
