import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScannerService } from './scanner.service';
import { ScannerController } from './scanner.controller';
import { ScannerProcessor } from './scanner.processor';
import { ScannerScheduler } from './scanner-scheduler.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExecutionModule } from '../execution/execution.module';
import { OrderFlowToolsService } from '../public-tools/order-flow-tools.service';

@Module({
  imports: [NotificationsModule, ExecutionModule, BullModule.registerQueue({ name: 'scanner' })],
  controllers: [ScannerController],
  providers: [ScannerService, ScannerProcessor, ScannerScheduler, OrderFlowToolsService],
})
export class ScannerModule {}
