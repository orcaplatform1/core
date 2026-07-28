import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import { PrismaService } from '../prisma/prisma.service';

const RSS_FEEDS = [
  { source: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
];

@Injectable()
export class NewsIngestionService {
  private readonly logger = new Logger(NewsIngestionService.name);
  private readonly parser = new Parser();

  constructor(private readonly prisma: PrismaService) {}

  async refresh(): Promise<void> {
    for (const feed of RSS_FEEDS) {
      try {
        const parsed = await this.parser.parseURL(feed.url);
        for (const item of parsed.items ?? []) {
          if (!item.link || !item.title) continue;
          await this.prisma.newsArticle.upsert({
            where: { url: item.link },
            update: {},
            create: {
              source: feed.source,
              title: item.title,
              url: item.link,
              summary: item.contentSnippet ?? null,
              publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
            },
          });
        }
      } catch (err) {
        this.logger.warn(`RSS refresh failed for ${feed.source}: ${err}`);
      }
    }
  }
}
