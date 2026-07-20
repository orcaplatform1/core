import { Module } from '@nestjs/common';
import { FooterService } from './footer.service';
import { FooterController } from './footer.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [FooterController],
  providers: [FooterService],
})
export class FooterModule {}
