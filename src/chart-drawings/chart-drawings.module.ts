import { Module } from '@nestjs/common';
import { ChartDrawingsService } from './chart-drawings.service';
import { ChartDrawingsController } from './chart-drawings.controller';

@Module({
  controllers: [ChartDrawingsController],
  providers: [ChartDrawingsService],
})
export class ChartDrawingsModule {}
