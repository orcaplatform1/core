import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 50 BTC (sat cinsinden) — bir bakiye değişiminin "hareket" (movement) olarak
// kaydedilmesi için aşılması gereken eşik.
const MOVEMENT_THRESHOLD_SAT = 50 * 100_000_000;

export interface WhaleAddressActivity {
  id: string;
  address: string;
  label: string;
  category: string;
  network: string;
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

@Injectable()
export class WhaleTrackerService {
  private readonly logger = new Logger(WhaleTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async refreshAll(): Promise<void> {
    const addresses = await this.prisma.whaleAddress.findMany();

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
