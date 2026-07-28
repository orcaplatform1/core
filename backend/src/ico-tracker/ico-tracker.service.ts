import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { IcoProject } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface IcoBenchIcoDto {
  id: string | number;
  name: string;
  tokenSymbol?: string;
  symbol?: string;
  status?: string;
  raised?: number | string;
  raisedAmountUsd?: number | string;
  rating?: number | string;
  ratingScore?: number | string;
  dateStart?: string;
  startDate?: string;
  dateEnd?: string;
  endDate?: string;
  website?: string;
  websiteUrl?: string;
  description?: string;
}

@Injectable()
export class IcoTrackerService {
  private readonly logger = new Logger(IcoTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ICObench Data API, istekleri saniye cinsinden bir timestamp + bu timestamp'in
  // özel anahtarla HMAC-SHA384 imzasıyla doğrular. Bkz. ICObench Data API dokümantasyonu.
  private signRequest(publicKey: string, privateKey: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const hash = crypto.createHmac('sha384', privateKey).update(String(timestamp)).digest('hex');
    return {
      'x-icobench-key': publicKey,
      'x-icobench-hash': hash,
      'x-icobench-timestamp': String(timestamp),
    };
  }

  private mapStatus(raw: string | undefined): 'UPCOMING' | 'ACTIVE' | 'ENDED' {
    const s = (raw ?? '').toLowerCase();
    if (s.includes('upcoming')) return 'UPCOMING';
    if (s.includes('active') || s.includes('ongoing')) return 'ACTIVE';
    return 'ENDED';
  }

  private toNumberOrNull(value: number | string | undefined): number | null {
    if (value == null) return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private toDateOrNull(value: string | undefined): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  async refresh(): Promise<void> {
    const publicKey = process.env.ICOBENCH_PUBLIC_KEY;
    const privateKey = process.env.ICOBENCH_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      this.logger.warn('ICOBENCH_PUBLIC_KEY/ICOBENCH_PRIVATE_KEY not set, skipping refresh');
      return;
    }

    try {
      const headers = this.signRequest(publicKey, privateKey);
      const res = await fetch('https://icobench.com/api/v1/icos?status=upcoming,active', {
        headers,
      });
      if (!res.ok) {
        this.logger.warn(`ICObench API request failed with status ${res.status}`);
        return;
      }
      const body = await res.json();
      const rows: IcoBenchIcoDto[] = Array.isArray(body) ? body : (body?.results ?? body?.data ?? []);
      if (!Array.isArray(rows) || rows.length === 0) return;

      for (const row of rows) {
        const externalId = String(row.id);
        if (!externalId) continue;
        await this.prisma.icoProject.upsert({
          where: { externalId },
          create: {
            externalId,
            name: row.name,
            tokenSymbol: row.tokenSymbol ?? row.symbol ?? null,
            status: this.mapStatus(row.status),
            raisedAmountUsd: this.toNumberOrNull(row.raisedAmountUsd ?? row.raised),
            ratingScore: this.toNumberOrNull(row.ratingScore ?? row.rating),
            startDate: this.toDateOrNull(row.startDate ?? row.dateStart),
            endDate: this.toDateOrNull(row.endDate ?? row.dateEnd),
            websiteUrl: row.websiteUrl ?? row.website ?? null,
            description: row.description ?? null,
          },
          update: {
            name: row.name,
            tokenSymbol: row.tokenSymbol ?? row.symbol ?? null,
            status: this.mapStatus(row.status),
            raisedAmountUsd: this.toNumberOrNull(row.raisedAmountUsd ?? row.raised),
            ratingScore: this.toNumberOrNull(row.ratingScore ?? row.rating),
            startDate: this.toDateOrNull(row.startDate ?? row.dateStart),
            endDate: this.toDateOrNull(row.endDate ?? row.dateEnd),
            websiteUrl: row.websiteUrl ?? row.website ?? null,
            description: row.description ?? null,
          },
        });
      }
    } catch (err) {
      this.logger.warn(`ICO refresh failed: ${err}`);
    }
  }

  async getIcos(): Promise<IcoProject[]> {
    return this.prisma.icoProject.findMany({
      orderBy: [{ raisedAmountUsd: 'desc' }, { ratingScore: 'desc' }],
    });
  }
}
