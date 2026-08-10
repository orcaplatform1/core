import { Module } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { ProgressModule } from '../progress/progress.module';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [ProgressModule, BadgesModule],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
