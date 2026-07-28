import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NewsIngestionService } from './news-ingestion.service';
import { SentimentScoringService } from './sentiment-scoring.service';

@Injectable()
export class NewsSentimentScheduler implements OnModuleInit {
  constructor(
    private readonly ingestion: NewsIngestionService,
    private readonly scoring: SentimentScoringService,
  ) {}

  async onModuleInit() {
    // Sırayla çalışmalı: puanlama ilk seferde henüz alınmamış haberleri bulamasın diye.
    this.ingestion
      .refresh()
      .then(() => this.scoring.scoreUnscored())
      .catch(() => undefined);
  }

  @Cron('*/20 * * * *')
  async ingest() {
    await this.ingestion.refresh();
  }

  @Cron('*/10 * * * *')
  async score() {
    await this.scoring.scoreUnscored();
  }
}
