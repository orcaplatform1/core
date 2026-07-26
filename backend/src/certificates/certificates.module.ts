import { Module } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [ProgressModule],
  controllers: [CertificatesController],
  providers: [CertificatesService],
})
export class CertificatesModule {}
