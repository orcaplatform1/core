import { Injectable, Logger } from '@nestjs/common';
import { TokenUnlockEvent } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TokenUnlockService {
  private readonly logger = new Logger(TokenUnlockService.name);

  constructor(private readonly prisma: PrismaService) {}

  async refresh(): Promise<void> {
    if (!process.env.CRYPTORANK_API_KEY) {
      this.logger.warn('CRYPTORANK_API_KEY not set, token unlock sync skipped');
      return;
    }

    // TODO: call CryptoRank Token Unlocks API once plan/key is confirmed
  }

  async getUpcoming(): Promise<TokenUnlockEvent[]> {
    return this.prisma.tokenUnlockEvent.findMany({
      where: { unlockDate: { gte: new Date() } },
      orderBy: { unlockDate: 'asc' },
    });
  }
}
