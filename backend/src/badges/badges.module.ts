import { Module } from '@nestjs/common';
import { BadgesService } from './badges.service';
import { BadgesController } from './badges.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [AuditLogModule, PointsModule],
  controllers: [BadgesController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
