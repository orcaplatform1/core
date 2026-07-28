import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { BadgesModule } from '../badges/badges.module';
import { StreakModule } from '../streak/streak.module';

@Module({
  imports: [BadgesModule, StreakModule],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
