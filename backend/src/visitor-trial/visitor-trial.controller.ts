import { Controller, Get, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { VisitorTrialService, VisitorTrialStatus } from './visitor-trial.service';

// Giris yapmamis ziyaretcilerin Araclar/Topluluk bolumlerindeki 2 dakikalik
// deneme suresini kontrol eder. Auth GEREKTIRMEZ - anonim ziyaretciler icin.
// Giris yapmis kullanicilar icin frontend bu ucu hic cagirmaz (bkz.
// components/layout/visitor-trial-gate.tsx).
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller('visitor-trial')
export class VisitorTrialController {
  constructor(private readonly visitorTrialService: VisitorTrialService) {}

  @Get('status')
  getStatus(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<VisitorTrialStatus> {
    return this.visitorTrialService.getStatus(req, res);
  }
}
