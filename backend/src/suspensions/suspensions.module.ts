import { Module } from '@nestjs/common';
import { SuspensionsService } from './suspensions.service';
import { SuspensionsController } from './suspensions.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SuspensionsController],
  providers: [SuspensionsService],
  exports: [SuspensionsService],
})
export class SuspensionsModule {}
