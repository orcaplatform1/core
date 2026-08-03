import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [AuditLogModule, NotificationsModule, StatsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
