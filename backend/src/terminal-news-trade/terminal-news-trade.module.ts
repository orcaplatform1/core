import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExecutionModule } from '../execution/execution.module';
import { XStreamService } from './x-stream.service';
import { NewsClassifierService } from './news-classifier.service';
import { TerminalNewsTradeService } from './terminal-news-trade.service';
import { TerminalNewsTradeController } from './terminal-news-trade.controller';

// Money Maker'in (execution/) sinyal kaynagi Orca ACS'ken, bu modulun sinyal
// kaynagi X (Twitter) haber akisi - ikisi Binance client'ini paylasir
// (ExecutionModule import edilir) ama state machine'leri ve istatistik
// tablolari TAMAMEN ayri (kullanici istegi 2026-08-20: istatistigi ayri tut,
// bkz. plan: "Neden AutoTradeService'i genisletmek yerine yeni bir servis?").
@Module({
  imports: [NotificationsModule, ExecutionModule],
  controllers: [TerminalNewsTradeController],
  providers: [XStreamService, NewsClassifierService, TerminalNewsTradeService],
  exports: [TerminalNewsTradeService],
})
export class TerminalNewsTradeModule {}
