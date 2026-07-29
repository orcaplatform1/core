// ESPUSDT SHORT vakasinda (stop, Turtle Soup kirilim mumunun asiri fitili yuzunden
// TP yapisindan tamamen kopmus, gercek R:R ~1:0.11 cikmisti) scanner.service.ts'e
// eklenen minimum R:R esiginin (SCANNER_MIN_RR, varsayilan 1.5) mevcut kayitlara
// geriye donuk uygulanmasi: esigin altinda kalan TrackedSignal kayitlari silinir,
// ScanResult snapshot'larindaki crypto dizilerinden ayni kayitlar cikarilir.
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

function getMinRR(): number {
  const configured = Number(process.env.SCANNER_MIN_RR);
  return Number.isFinite(configured) && configured > 0 ? configured : 1.5;
}

async function cleanTrackedSignals(minRR: number) {
  const bad = await prisma.trackedSignal.findMany({ where: { rr: { lt: minRR } } });
  if (bad.length === 0) {
    console.log('TrackedSignal: esigin altinda kayit yok.');
    return;
  }
  console.log(`TrackedSignal: ${bad.length} kayit esigin (${minRR}) altinda, siliniyor:`);
  for (const s of bad) {
    console.log(`  - ${s.symbol} ${s.direction} rr=${s.rr} status=${s.status} createdAt=${s.createdAt.toISOString()}`);
  }
  const result = await prisma.trackedSignal.deleteMany({ where: { rr: { lt: minRR } } });
  console.log(`TrackedSignal: ${result.count} kayit silindi.`);
}

async function cleanScanResults(minRR: number) {
  const scans = await prisma.scanResult.findMany();
  let touchedScans = 0;
  let removedEntries = 0;
  for (const scan of scans) {
    const results = scan.results as any;
    const crypto = Array.isArray(results?.crypto) ? results.crypto : null;
    if (!crypto) continue;
    const kept = crypto.filter((c: any) => typeof c.rr !== 'number' || c.rr >= minRR);
    if (kept.length === crypto.length) continue;
    const removed = crypto.filter((c: any) => typeof c.rr === 'number' && c.rr < minRR);
    for (const c of removed) {
      console.log(`  - ScanResult ${scan.id} (${scan.style}, ${scan.createdAt.toISOString()}): ${c.symbol} ${c.direction} rr=${c.rr}`);
    }
    await prisma.scanResult.update({
      where: { id: scan.id },
      data: { results: { ...results, crypto: kept } },
    });
    touchedScans++;
    removedEntries += removed.length;
  }
  if (removedEntries === 0) {
    console.log('ScanResult: esigin altinda kayit yok.');
  } else {
    console.log(`ScanResult: ${touchedScans} kayitta toplam ${removedEntries} sinyal esik altinda bulunup temizlendi.`);
  }
}

async function main() {
  const minRR = getMinRR();
  console.log(`Minimum R:R esigi: ${minRR}`);
  await cleanTrackedSignals(minRR);
  await cleanScanResults(minRR);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
