import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PublicToolsController } from './public-tools.controller';
import { PublicToolsProcessor } from './public-tools.processor';
import { PublicToolsScheduler } from './public-tools-scheduler.service';
import { CryptoToolsService } from './crypto-tools.service';
import { ForexToolsService } from './forex-tools.service';
import { EconomicToolsService } from './economic-tools.service';
import { BistToolsService } from './bist-tools.service';
import { OnchainToolsService } from './onchain-tools.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'public-tools' })],
  controllers: [PublicToolsController],
  providers: [
    CryptoToolsService,
    ForexToolsService,
    EconomicToolsService,
    BistToolsService,
    OnchainToolsService,
    PublicToolsProcessor,
    PublicToolsScheduler,
  ],
})
export class PublicToolsModule {}
