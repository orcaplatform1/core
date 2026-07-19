import { Module } from '@nestjs/common';
import { LiveLessonsService } from './live-lessons.service';
import { LiveLessonsController } from './live-lessons.controller';

@Module({
  controllers: [LiveLessonsController],
  providers: [LiveLessonsService],
})
export class LiveLessonsModule {}
