import { Module } from '@nestjs/common';
import { AirdropController } from './airdrop.controller';
import { AdminAirdropController } from './admin-airdrop.controller';
import { AirdropService } from './airdrop.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [AirdropController, AdminAirdropController],
  providers: [AirdropService],
  exports: [AirdropService],
})
export class AirdropModule {}
