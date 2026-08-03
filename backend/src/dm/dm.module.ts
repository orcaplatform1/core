import { Module } from '@nestjs/common';
import { DmService } from './dm.service';
import { DmController } from './dm.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { SuspensionsModule } from '../suspensions/suspensions.module';

@Module({
  imports: [NotificationsModule, SuspensionsModule],
  controllers: [DmController],
  providers: [DmService],
})
export class DmModule {}
