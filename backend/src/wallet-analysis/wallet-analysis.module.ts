import { Module } from '@nestjs/common';
import { WalletAnalysisController } from './wallet-analysis.controller';
import { WalletAnalysisService } from './wallet-analysis.service';

@Module({
  controllers: [WalletAnalysisController],
  providers: [WalletAnalysisService],
})
export class WalletAnalysisModule {}
