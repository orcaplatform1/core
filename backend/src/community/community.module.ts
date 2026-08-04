import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [NotificationsModule, StorageModule, AuditLogModule, BadgesModule],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
