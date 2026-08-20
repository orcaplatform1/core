import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BinanceFuturesClientService } from './binance-futures-client.service';
import { BinanceUserStreamService } from './binance-user-stream.service';
import { AutoTradeService } from './auto-trade.service';
import { AutoTradeController } from './auto-trade.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [AutoTradeController],
  providers: [BinanceFuturesClientService, BinanceUserStreamService, AutoTradeService],
  exports: [AutoTradeService, BinanceFuturesClientService, BinanceUserStreamService],
})
export class ExecutionModule {}
