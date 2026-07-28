import { Module } from '@nestjs/common';
import { NewsIngestionService } from './news-ingestion.service';
import { SentimentScoringService } from './sentiment-scoring.service';
import { NewsSentimentService } from './news-sentiment.service';
import { NewsSentimentScheduler } from './news-sentiment-scheduler.service';
import { NewsSentimentController } from './news-sentiment.controller';

@Module({
  controllers: [NewsSentimentController],
  providers: [NewsIngestionService, SentimentScoringService, NewsSentimentService, NewsSentimentScheduler],
})
export class NewsSentimentModule {}
