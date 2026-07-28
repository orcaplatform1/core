import { Module } from '@nestjs/common';
import { CryptoCalendarController } from './crypto-calendar.controller';
import { CryptoCalendarService } from './crypto-calendar.service';
import { CryptoCalendarScheduler } from './crypto-calendar-scheduler.service';

@Module({
  controllers: [CryptoCalendarController],
  providers: [CryptoCalendarService, CryptoCalendarScheduler],
})
export class CryptoCalendarModule {}
