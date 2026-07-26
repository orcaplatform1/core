import { Module } from '@nestjs/common';
import { SiteContentService } from './site-content.service';
import { SiteContentController } from './site-content.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [SiteContentController],
  providers: [SiteContentService],
})
export class SiteContentModule {}
