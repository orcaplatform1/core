import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function signedScore(label: string | null, score: number | null): number {
  if (label == null || score == null) return 0;
  if (label === 'POSITIVE') return score;
  if (label === 'NEGATIVE') return -score;
  return 0;
}

@Injectable()
export class NewsSentimentService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const scored = await this.prisma.newsArticle.findMany({
      where: { sentimentLabel: { not: null }, publishedAt: { gte: since } },
      orderBy: { publishedAt: 'desc' },
    });

    const byDay = new Map<string, { sum: number; count: number }>();
    for (const article of scored) {
      const day = article.publishedAt.toISOString().slice(0, 10);
      const entry = byDay.get(day) ?? { sum: 0, count: 0 };
      entry.sum += signedScore(article.sentimentLabel, article.sentimentScore);
      entry.count += 1;
      byDay.set(day, entry);
    }
    const trend = Array.from(byDay.entries())
      .map(([date, { sum, count }]) => ({ date, avgScore: sum / count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const articles = scored.slice(0, 30).map((a) => ({
      id: a.id,
      source: a.source,
      title: a.title,
      url: a.url,
      publishedAt: a.publishedAt,
      sentimentLabel: a.sentimentLabel,
      sentimentScore: a.sentimentScore,
    }));

    return { trend, articles };
  }
}
