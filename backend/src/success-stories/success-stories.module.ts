import { Module } from '@nestjs/common';
import { SuccessStoriesService } from './success-stories.service';
import { SuccessStoriesController } from './success-stories.controller';
import { CertificatesModule } from '../certificates/certificates.module';
import { StatsModule } from '../stats/stats.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [CertificatesModule, StatsModule, AuditLogModule],
  controllers: [SuccessStoriesController],
  providers: [SuccessStoriesService],
})
export class SuccessStoriesModule {}
