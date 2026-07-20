import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScannerService } from './scanner.service';
import { ScannerController } from './scanner.controller';
import { ScannerProcessor } from './scanner.processor';
import { ScannerScheduler } from './scanner-scheduler.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule, BullModule.registerQueue({ name: 'scanner' })],
  controllers: [ScannerController],
  providers: [ScannerService, ScannerProcessor, ScannerScheduler],
})
export class ScannerModule {}
