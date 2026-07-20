import { Module } from '@nestjs/common';
import { ManageService } from './manage.service';
import { ManageController } from './manage.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [NotificationsModule, AuditLogModule],
  controllers: [ManageController],
  providers: [ManageService],
})
export class ManageModule {}
