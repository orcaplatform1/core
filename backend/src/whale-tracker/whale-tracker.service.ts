import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { PrismaService } from '../prisma/prisma.service';
import { KNOWN_WHALE_LABELS, labelFromBitinfochartsHint, WhaleCategory } from './whale-known-labels';

// 50 BTC (sat cinsinden) — bir bakiye değişiminin "hareket" (movement) olarak
// kaydedilmesi için aşılması gereken eşik.
const MOVEMENT_THRESHOLD_SAT = 50 * 100_000_000;

const RICH_LIST_URL = 'https://bitinfocharts.com/top-100-richest-bitcoin-addresses.html';
const TOP_N = 30;

export interface WhaleAddressActivity {
  id: string;
  address: string;
  label: string;
  category: string;
  network: string;
  rank: number | null;
  latestBalanceSat: number | null;
  latestBalanceCapturedAt: Date | null;
}

export interface WhaleMovementActivity {
  id: string;
  addressId: string;
  addressLabel: string;
  txid: string;
  amountSat: number;
  direction: string;
  balanceAfterSat: number;
  detectedAt: Date;
}

interface RichListRow {
  rank: number;
  address: string;
  walletHint: string | null;
  balanceBtc: number;
}

@Injectable()
export class WhaleTrackerService {
  private readonly logger = new Logger(WhaleTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  // bitinfocharts'in "Top 100 Richest Bitcoin Addresses" sayfasini scrape eder.
  // Site HTML'i degisirse (kolon sirasi, class isimleri vb.) bu fonksiyon [] dondurur,
  // cagiran taraf (syncTopAddresses) bunu hata olarak degil "bu turda yenileme yok,
  // mevcut son bilinen liste ile devam et" olarak yorumlar - hicbir DB satiri silinmez.
  private async scrapeRichList(limit: number): Promise<RichListRow[]> {
    try {
      const res = await fetch(RICH_LIST_URL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        },
      });
      if (!res.ok) {
        this.logger.warn(`bitinfocharts rich-list istegi basarisiz: HTTP ${res.status}`);
        return [];
      }
      const html = await res.text();
      const $ = cheerio.load(html);

      // Sayfa ilk ~20 satiri "tblOne" tablosunda, gerisini (21-100) tag olarak
      // gomulu ayri bir "tblOne2" tablosunda (kendi <tbody> etiketi YOK, dogrudan
      // <tr> iceriyor) tutuyor - ikisi de secilir.
      const rows: RichListRow[] = [];
      $('#tblOne tr, #tblOne2 tr').each((_, el) => {
        const $row = $(el);
        const cells = $row.find('td');
        if (cells.length < 3) return;

        const rank = parseInt($(cells[0]).text().trim(), 10);
        const addressCell = $(cells[1]);
        // Adres HTML'de bazen responsive gorunum icin ".." ile kisaltilmis
        // gosteriliyor (orta kismi CSS ile gizleniyor) - guvenilir tam adres
        // icin href'ten okunur, gorunen metinden DEGIL.
        const href = addressCell.find('a[href*="/bitcoin/address/"]').first().attr('href') ?? '';
        const addressMatch = href.match(/\/bitcoin\/address\/([A-Za-z0-9]+)/);
        const address = addressMatch ? addressMatch[1] : null;
        const walletHref = addressCell.find('a[href^="/bitcoin/wallet/"]').attr('href') ?? null;
        const walletHint = walletHref ? decodeURIComponent(walletHref.replace('/bitcoin/wallet/', '')) : null;
        const balanceText = $(cells[2]).text().trim();
        const balanceMatch = balanceText.match(/^([\d,.]+)\s*BTC/);
        const balanceBtc = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : null;

        if (!address || !Number.isFinite(rank) || balanceBtc === null) return;
        rows.push({ rank, address, walletHint, balanceBtc });
      });

      rows.sort((a, b) => a.rank - b.rank);
      return rows.slice(0, limit);
    } catch (err) {
      this.logger.warn(`bitinfocharts rich-list scrape hatasi: ${err}`);
      return [];
    }
  }

  // Etiket cozumleme onceligi: 1) elle guncellenebilir KNOWN_WHALE_LABELS config'i,
  // 2) bitinfocharts'in kendi "wallet" ipucu (varsa, okunabilir hale getirilip
  // kaba bir kategoriye atanir), 3) hicbiri yoksa "Bilinmeyen"/UNKNOWN. Not:
  // Coinbase Custody gibi kurumsal saklama adresleri (ör. BlackRock IBIT'in
  // BTC'sini barindirabilecek adresler) bitinfocharts'ta da ayri ayri ETF
  // bazinda etiketlenmiyor - sadece genel bir "Coinbase" ipucu varsa yakalanir,
  // hangi ETF'e ait oldugu KESIN olarak ayristirilamaz (frontend'de kullaniciya
  // bu sinirlama not olarak belirtiliyor).
  private resolveLabel(address: string, walletHint: string | null): { label: string; category: WhaleCategory } {
    const known = KNOWN_WHALE_LABELS[address];
    if (known) return known;
    if (walletHint) return labelFromBitinfochartsHint(walletHint);
    return { label: 'Bilinmeyen', category: 'UNKNOWN' };
  }

  // Gunluk calisir (bkz. whale-tracker-scheduler.service.ts): rich-list'i tazeler,
  // ilk TOP_N adresi upsert eder (yeni adres olustur / mevcut adresin rank+etiketini
  // guncelle), o an listede olmayan onceden aktif adresleri isActive=false yapar
  // (SILMEZ - gecmis bakiye/hareket kayitlari kalir). Scrape basarisiz/bos donerse
  // hicbir DB degisikligi yapilmadan erken cikilir - "son bilinen liste" boylece
  // kendiliginden korunmus olur.
  async syncTopAddresses(): Promise<{ synced: number } | { synced: 0; reason: string }> {
    const rows = await this.scrapeRichList(TOP_N);
    if (rows.length === 0) {
      this.logger.warn('Rich-list taramasi bos/basarisiz sonuc verdi, mevcut liste korunuyor.');
      return { synced: 0, reason: 'scrape_failed_or_empty' };
    }

    const seenAddresses = new Set<string>();
    for (const row of rows) {
      seenAddresses.add(row.address);
      const { label, category } = this.resolveLabel(row.address, row.walletHint);
      await this.prisma.whaleAddress.upsert({
        where: { address: row.address },
        update: { rank: row.rank, isActive: true, label, category: category as any },
        create: {
          address: row.address,
          label,
          category: category as any,
          network: 'BTC',
          rank: row.rank,
          isActive: true,
        },
      });
    }

    await this.prisma.whaleAddress.updateMany({
      where: { isActive: true, address: { notIn: Array.from(seenAddresses) } },
      data: { isActive: false, rank: null },
    });

    return { synced: rows.length };
  }

  async refreshAll(): Promise<void> {
    // Sadece su an ilk TOP_N icinde olan (isActive) adresler izlenir - listeden
    // dusen adreslerin gecmisi kalir ama artik her 7 dakikada sorgulanmaz.
    const addresses = await this.prisma.whaleAddress.findMany({ where: { isActive: true } });

    for (const address of addresses) {
      try {
        const res = await fetch(`https://mempool.space/api/address/${address.address}`);
        if (!res.ok) {
          this.logger.warn(`mempool.space adres sorgusu başarısız (${address.address}): ${res.status}`);
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }
        const data = await res.json();
        const fundedSum = data?.chain_stats?.funded_txo_sum ?? 0;
        const spentSum = data?.chain_stats?.spent_txo_sum ?? 0;
        const currentBalanceSat = BigInt(fundedSum - spentSum);

        const previous = await this.prisma.whaleBalanceSnapshot.findFirst({
          where: { addressId: address.id },
          orderBy: { capturedAt: 'desc' },
        });

        if (previous) {
          const delta = currentBalanceSat - previous.balanceSat;
          if (Math.abs(Number(delta)) >= MOVEMENT_THRESHOLD_SAT) {
            try {
              const txsRes = await fetch(`https://mempool.space/api/address/${address.address}/txs`);
              if (txsRes.ok) {
                const txs = await txsRes.json();
                const latestTx = Array.isArray(txs) ? txs[0] : null;
                if (latestTx?.txid) {
                  const existing = await this.prisma.whaleMovement.findUnique({
                    where: { txid: latestTx.txid },
                  });
                  if (!existing) {
                    await this.prisma.whaleMovement.create({
                      data: {
                        addressId: address.id,
                        txid: latestTx.txid,
                        amountSat: BigInt(Math.abs(Number(delta))),
                        direction: currentBalanceSat > previous.balanceSat ? 'IN' : 'OUT',
                        balanceAfterSat: currentBalanceSat,
                      },
                    });
                  }
                }
              }
            } catch (err) {
              this.logger.warn(`Hareket tespiti başarısız (${address.address}): ${err}`);
            }
          }
        }

        await this.prisma.whaleBalanceSnapshot.create({
          data: {
            addressId: address.id,
            balanceSat: currentBalanceSat,
          },
        });
      } catch (err) {
        this.logger.warn(`refreshAll adres işleme hatası (${address.address}): ${err}`);
        continue;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  async getRecentActivity(): Promise<{
    addresses: WhaleAddressActivity[];
    movements: WhaleMovementActivity[];
  }> {
    const [addressRows, movementRows] = await Promise.all([
      this.prisma.whaleAddress.findMany({
        where: { isActive: true },
        orderBy: [{ rank: 'asc' }],
        include: {
          balanceSnapshots: {
            orderBy: { capturedAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.whaleMovement.findMany({
        orderBy: { detectedAt: 'desc' },
        take: 50,
        include: { address: true },
      }),
    ]);

    const addresses: WhaleAddressActivity[] = addressRows.map((a) => {
      const latest = a.balanceSnapshots[0];
      return {
        id: a.id,
        address: a.address,
        label: a.label,
        category: a.category,
        network: a.network,
        rank: a.rank,
        latestBalanceSat: latest ? Number(latest.balanceSat) : null,
        latestBalanceCapturedAt: latest ? latest.capturedAt : null,
      };
    });

    const movements: WhaleMovementActivity[] = movementRows.map((m) => ({
      id: m.id,
      addressId: m.addressId,
      addressLabel: m.address.label,
      txid: m.txid,
      amountSat: Number(m.amountSat),
      direction: m.direction,
      balanceAfterSat: Number(m.balanceAfterSat),
      detectedAt: m.detectedAt,
    }));

    return { addresses, movements };
  }
}
