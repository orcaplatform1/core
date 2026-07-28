import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SENTIMENT_SERVICE_URL = process.env.SENTIMENT_SERVICE_URL || 'http://127.0.0.1:8001';

@Injectable()
export class SentimentScoringService {
  private readonly logger = new Logger(SentimentScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  async scoreUnscored(): Promise<void> {
    const unscored = await this.prisma.newsArticle.findMany({
      where: { sentimentLabel: null },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
    if (unscored.length === 0) return;

    try {
      const res = await fetch(`${SENTIMENT_SERVICE_URL}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: unscored.map((a) => a.title) }),
      });
      if (!res.ok) {
        this.logger.warn(`Sentiment service returned ${res.status}`);
        return;
      }
      const results: { label: string; score: number }[] = await res.json();
      await Promise.all(
        unscored.map((article, i) => {
          const result = results[i];
          if (!result) return null;
          return this.prisma.newsArticle.update({
            where: { id: article.id },
            data: {
              sentimentLabel: result.label as 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
              sentimentScore: result.score,
              scoredAt: new Date(),
            },
          });
        }),
      );
    } catch (err) {
      this.logger.warn(`Sentiment scoring failed (is sentiment-service running?): ${err}`);
    }
  }
}
