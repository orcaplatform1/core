import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PointsService } from './points.service';

@Injectable()
export class PointsScheduler {
  constructor(private readonly pointsService: PointsService) {}

  // Her Pazartesi 00:00 — haftalık liderlik tablosu sıfırlanır, totalPoints kalıcı kalır.
  @Cron('0 0 * * 1')
  async resetWeeklyPoints() {
    await this.pointsService.resetPeriodPoints();
  }
}
