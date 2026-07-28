import { Module } from '@nestjs/common';
import { StreakService } from './streak.service';
import { StreakController } from './streak.controller';
import { BadgesModule } from '../badges/badges.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [BadgesModule, PointsModule],
  controllers: [StreakController],
  providers: [StreakService],
  exports: [StreakService],
})
export class StreakModule {}
