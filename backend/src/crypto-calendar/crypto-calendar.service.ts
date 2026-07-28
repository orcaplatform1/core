import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CoinMarketCalEvent {
  id: number | string;
  title?: { en?: string };
  description?: { en?: string };
  coins?: { symbol?: string }[];
  categories?: { name?: string }[];
  date_event?: string;
  percentage?: number;
  source?: string;
}

@Injectable()
export class CryptoCalendarService {
  private readonly logger = new Logger(CryptoCalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  async refresh(): Promise<void> {
    const apiKey = process.env.COINMARKETCAL_API_KEY;
    if (apiKey) {
      await this.refreshFromApi(apiKey);
    } else {
      await this.refreshMock();
    }
  }

  private async refreshFromApi(apiKey: string): Promise<void> {
    try {
      const res = await fetch('https://developers.coinmarketcal.com/v1/events?max=100&sortBy=hot_events', {
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        this.logger.warn(`CoinMarketCal API isteği başarısız: ${res.status}`);
        return;
      }
      const body = await res.json();
      const events: CoinMarketCalEvent[] = body?.body ?? body?.data ?? [];
      if (!Array.isArray(events) || events.length === 0) return;

      for (const ev of events) {
        const externalId = String(ev.id);
        const title = ev.title?.en ?? 'Bilinmeyen Etkinlik';
        const description = ev.description?.en ?? null;
        const coins = (ev.coins ?? []).map((c) => c.symbol).filter((s): s is string => !!s);
        const category = ev.categories?.[0]?.name ?? null;
        const eventDate = ev.date_event ? new Date(ev.date_event) : null;
        if (!eventDate || Number.isNaN(eventDate.getTime())) continue;
        const hotScore = Math.max(0, Math.min(5, Math.round((ev.percentage ?? 0) / 20)));

        await this.prisma.cryptoCalendarEvent.upsert({
          where: { externalId },
          create: {
            externalId,
            title,
            description,
            coins,
            category,
            eventDate,
            hotScore,
            sourceUrl: ev.source ?? null,
            isMock: false,
          },
          update: {
            title,
            description,
            coins,
            category,
            eventDate,
            hotScore,
            sourceUrl: ev.source ?? null,
            isMock: false,
          },
        });
      }

      // Gerçek veri geldiğinde örnek verilerin karışmaması için temizle.
      await this.prisma.cryptoCalendarEvent.deleteMany({ where: { isMock: true } });
    } catch (err) {
      this.logger.warn(`CoinMarketCal refresh başarısız: ${err}`);
    }
  }

  private async refreshMock(): Promise<void> {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const samples: {
      title: string;
      description: string;
      coins: string[];
      category: string;
      dayOffset: number;
      hotScore: number;
    }[] = [
      {
        title: 'Ethereum Mainnet Yükseltmesi',
        description: 'Ethereum ağında ölçeklenebilirlik ve gas ücretlerini iyileştiren yeni bir protokol yükseltmesi devreye alınacak.',
        coins: ['ETH'],
        category: 'Mainnet Launch',
        dayOffset: 2,
        hotScore: 5,
      },
      {
        title: 'Solana Binance İkili Listelemesi',
        description: 'Yeni bir Solana ekosistem tokenının Binance spot piyasasında işlem görmeye başlaması bekleniyor.',
        coins: ['SOL'],
        category: 'Exchange Listing',
        dayOffset: 5,
        hotScore: 4,
      },
      {
        title: 'Chainlink Kurumsal Ortaklık Duyurusu',
        description: 'Chainlink, geleneksel finans kurumlarıyla yeni bir veri entegrasyonu ortaklığını duyuracak.',
        coins: ['LINK'],
        category: 'Partnership',
        dayOffset: 7,
        hotScore: 3,
      },
      {
        title: 'Cardano Topluluk AMA Etkinliği',
        description: 'Cardano kurucu ekibi, yol haritası ve yaklaşan geliştirmeler hakkında canlı soru-cevap yapacak.',
        coins: ['ADA'],
        category: 'AMA',
        dayOffset: 9,
        hotScore: 2,
      },
      {
        title: 'Polygon zkEVM Güncellemesi',
        description: 'Polygon, sıfır bilgi kanıtı teknolojisini kullanan zkEVM ağında performans güncellemesi yayınlayacak.',
        coins: ['MATIC'],
        category: 'Mainnet Launch',
        dayOffset: 12,
        hotScore: 3,
      },
      {
        title: 'Avalanche Coinbase Listeleme Söylentisi',
        description: 'Avalanche ekosistemine ait yeni bir tokenın Coinbase\'de listelenmesi bekleniyor.',
        coins: ['AVAX'],
        category: 'Exchange Listing',
        dayOffset: 16,
        hotScore: 4,
      },
      {
        title: 'Polkadot Parachain Ortaklığı',
        description: 'Polkadot ekosistemindeki bir parachain projesi, büyük bir Web3 altyapı sağlayıcısıyla iş birliği açıklayacak.',
        coins: ['DOT'],
        category: 'Partnership',
        dayOffset: 21,
        hotScore: 2,
      },
      {
        title: 'Ripple Düzenleyici Güncellemesi AMA',
        description: 'Ripple ekibi, güncel düzenleyici gelişmeler ve XRP ekosistemi hakkında canlı yayında soruları yanıtlayacak.',
        coins: ['XRP'],
        category: 'AMA',
        dayOffset: 26,
        hotScore: 1,
      },
    ];

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const externalId = `mock-${i + 1}`;
      const eventDate = new Date(now + s.dayOffset * dayMs);
      await this.prisma.cryptoCalendarEvent.upsert({
        where: { externalId },
        create: {
          externalId,
          title: s.title,
          description: s.description,
          coins: s.coins,
          category: s.category,
          eventDate,
          hotScore: s.hotScore,
          sourceUrl: null,
          isMock: true,
        },
        update: {
          title: s.title,
          description: s.description,
          coins: s.coins,
          category: s.category,
          eventDate,
          hotScore: s.hotScore,
          sourceUrl: null,
          isMock: true,
        },
      });
    }
  }

  async getUpcoming(days: number) {
    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return this.prisma.cryptoCalendarEvent.findMany({
      where: { eventDate: { gte: now, lte: until } },
      orderBy: [{ hotScore: 'desc' }, { eventDate: 'asc' }],
    });
  }
}
