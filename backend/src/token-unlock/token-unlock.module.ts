import { Module } from '@nestjs/common';
import { TokenUnlockController } from './token-unlock.controller';
import { TokenUnlockService } from './token-unlock.service';
import { TokenUnlockScheduler } from './token-unlock-scheduler.service';

@Module({
  controllers: [TokenUnlockController],
  providers: [TokenUnlockService, TokenUnlockScheduler],
})
export class TokenUnlockModule {}
