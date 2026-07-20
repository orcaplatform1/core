import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTodaysQuote() {
    const totalQuotes = await this.prisma.quote.count();

    if (totalQuotes === 0) {
      return null;
    }

    const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const order = (daysSinceEpoch % totalQuotes) + 1;

    const quote = await this.prisma.quote.findUnique({ where: { order } });

    if (!quote) return null;

    return {
      text: quote.text,
      author: quote.author,
      profession: quote.profession,
      formatted: `Günün Sözü: ${quote.text} - ${quote.author} / ${quote.profession}`,
    };
  }
}
