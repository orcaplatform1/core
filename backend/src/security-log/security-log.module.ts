import { Module } from '@nestjs/common';
import { SecurityLogService } from './security-log.service';
import { SecurityLogController } from './security-log.controller';

@Module({
  controllers: [SecurityLogController],
  providers: [SecurityLogService],
  exports: [SecurityLogService],
})
export class SecurityLogModule {}
