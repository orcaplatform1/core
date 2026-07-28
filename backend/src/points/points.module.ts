import { Module } from '@nestjs/common';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { PointsScheduler } from './points-scheduler.service';

@Module({
  controllers: [PointsController],
  providers: [PointsService, PointsScheduler],
  exports: [PointsService],
})
export class PointsModule {}
