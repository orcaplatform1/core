import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../cache/redis-cache.service';

export interface EconomicIndicator {
  id: string;
  label: string;
  /** FRED seri kimliği */
  seriesId: string;
  latestValue: number;
  previousValue: number | null;
  latestDate: string;
  unit: string;
}

export interface FomcMeeting {
  date: string;
  label: string;
}

const CACHE_KEY = 'tools:economic:indicators';

// Sadece ABD verisi — FRED dışında, çok ülkeli, ileri tarihli ve güvenilir ücretsiz
// bir ekonomik takvim API'si yok (ForexFactory/Investing.com resmi API sunmuyor,
// Trading Economics'in ücretsiz katmanı çok kısıtlı). Kapsamı genişletmek için
// ileride ücretli bir sağlayıcıya geçiş gerekir.
const INDICATORS: { id: string; label: string; seriesId: string; unit: string }[] = [
  { id: 'cpi', label: 'TÜFE (CPI)', seriesId: 'CPIAUCSL', unit: 'Endeks' },
  { id: 'core-cpi', label: 'Çekirdek TÜFE', seriesId: 'CPILFESL', unit: 'Endeks' },
  { id: 'ppi', label: 'ÜFE (PPI)', seriesId: 'PPIACO', unit: 'Endeks' },
  { id: 'fed-funds', label: 'Fed Faiz Oranı', seriesId: 'FEDFUNDS', unit: '%' },
  { id: 'unemployment', label: 'İşsizlik Oranı', seriesId: 'UNRATE', unit: '%' },
  { id: 'nfp', label: 'Tarım Dışı İstihdam', seriesId: 'PAYEMS', unit: 'Bin kişi' },
];

// Fed toplantı takvimi yıllar öncesinden kamuya açık şekilde ilan ediliyor;
// bu yüzden API'siz, elle güncellenen bir liste yeterli. Kaynak: federalreserve.gov
const UPCOMING_FOMC_MEETINGS: FomcMeeting[] = [
  { date: '2026-09-16', label: 'FOMC Toplantısı (Eylül 2026)' },
  { date: '2026-10-28', label: 'FOMC Toplantısı (Ekim 2026)' },
  { date: '2026-12-09', label: 'FOMC Toplantısı (Aralık 2026)' },
];

@Injectable()
export class EconomicToolsService {
  private readonly logger = new Logger(EconomicToolsService.name);

  constructor(private readonly cache: RedisCacheService) {}

  async refreshIndicators(): Promise<void> {
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey) {
      this.logger.warn('FRED_API_KEY not set — economic indicators will not be available.');
      return;
    }

    const results: EconomicIndicator[] = [];
    for (const ind of INDICATORS) {
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${ind.seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=2`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const obs = data?.observations ?? [];
        if (obs.length === 0) continue;
        const latest = obs[0];
        const previous = obs[1];
        results.push({
          id: ind.id,
          label: ind.label,
          seriesId: ind.seriesId,
          latestValue: parseFloat(latest.value),
          previousValue: previous ? parseFloat(previous.value) : null,
          latestDate: latest.date,
          unit: ind.unit,
        });
      } catch (err) {
        this.logger.warn(`FRED fetch failed for ${ind.seriesId}: ${err}`);
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    if (results.length > 0) {
      await this.cache.setJson(CACHE_KEY, results, 3600 * 20);
    }
  }

  async getIndicators(): Promise<EconomicIndicator[]> {
    return (await this.cache.getJson<EconomicIndicator[]>(CACHE_KEY)) ?? [];
  }

  getUpcomingFomcMeetings(): FomcMeeting[] {
    const now = Date.now();
    return UPCOMING_FOMC_MEETINGS.filter((m) => new Date(m.date).getTime() >= now);
  }
}
