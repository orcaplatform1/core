import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import { PrismaService } from '../prisma/prisma.service';

const RSS_FEEDS = [
  { source: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { source: 'Decrypt', url: 'https://decrypt.co/feed' },
  { source: 'The Block', url: 'https://www.theblock.co/rss.xml' },
];

// Ayni haberin birden fazla kaynaktan farkli baslik/URL ile raporlanmasi, sentiment
// trend istatistigini yapay olarak carpitabiliyordu (ayni olay 2-3 kere sayiliyor).
// Bu esik/pencere ile baslik benzerligi (Jaccard) uzerinden capraz-kaynak tekrar filtrelenir.
const DEDUP_SIMILARITY_THRESHOLD = 0.5;
const DEDUP_LOOKBACK_HOURS = 72;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'is', 'are',
  've', 'bir', 'bu', 'da', 'de', 'ile', 'icin', 'için',
]);

// Kripto haberlerinde ayni olay ticker (BTC) veya tam isimle (Bitcoin) raporlanabiliyor -
// bu, kelime-kumesi benzerligini yapay olarak dusurup gercek tekrarlari kacirtiyordu.
// En yaygin coinler icin ticker<->isim varyantlari tek bir kanonik token'a indirgenir.
const TICKER_SYNONYMS: Record<string, string> = {
  btc: 'bitcoin', eth: 'ethereum', xrp: 'ripple', sol: 'solana', bnb: 'binancecoin',
  doge: 'dogecoin', ada: 'cardano', usdt: 'tether', link: 'chainlink', dot: 'polkadot',
  avax: 'avalanche', matic: 'polygon', ltc: 'litecoin', shib: 'shibainu', trx: 'tron',
  atom: 'cosmos', uni: 'uniswap', xlm: 'stellar', apt: 'aptos', arb: 'arbitrum',
  op: 'optimism', ton: 'toncoin',
};

function normalizeTitle(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map((w) => TICKER_SYNONYMS[w] ?? w);
  return new Set(words);
}

function titleSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

@Injectable()
export class NewsIngestionService {
  private readonly logger = new Logger(NewsIngestionService.name);
  private readonly parser = new Parser();

  constructor(private readonly prisma: PrismaService) {}

  async refresh(): Promise<void> {
    // Son DEDUP_LOOKBACK_HOURS icindeki basliklar bir kere cekilir (N+1 sorgu olmasin
    // diye) - capraz-kaynak benzerlik kontrolu buna karsi yapilir. Ayni refresh turu
    // icinde farkli kaynaklardan gelen tekrarlari da yakalamak icin yeni eklenenler
    // de bu kumeye eklenerek devam edilir.
    const lookbackDate = new Date(Date.now() - DEDUP_LOOKBACK_HOURS * 60 * 60 * 1000);
    const recent = await this.prisma.newsArticle.findMany({
      where: { publishedAt: { gte: lookbackDate } },
      select: { title: true },
    });
    const recentTitleSets = recent.map((r) => normalizeTitle(r.title));

    for (const feed of RSS_FEEDS) {
      try {
        const parsed = await this.parser.parseURL(feed.url);
        for (const item of parsed.items ?? []) {
          if (!item.link || !item.title) continue;

          const existing = await this.prisma.newsArticle.findUnique({ where: { url: item.link } });
          if (existing) continue; // ayni URL zaten var - upsert'e gerek yok, degisen bir sey yok

          const candidateSet = normalizeTitle(item.title);
          const duplicateOf = recentTitleSets.find(
            (existingSet) => titleSimilarity(candidateSet, existingSet) >= DEDUP_SIMILARITY_THRESHOLD,
          );
          if (duplicateOf) {
            this.logger.debug(`Tekrar sayilan haber atlandi (${feed.source}): "${item.title}"`);
            continue;
          }

          await this.prisma.newsArticle.create({
            data: {
              source: feed.source,
              title: item.title,
              url: item.link,
              summary: item.contentSnippet ?? null,
              publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
            },
          });
          recentTitleSets.push(candidateSet);
        }
      } catch (err) {
        this.logger.warn(`RSS refresh failed for ${feed.source}: ${err}`);
      }
    }
  }
}
