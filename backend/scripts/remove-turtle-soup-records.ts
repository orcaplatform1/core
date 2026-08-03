import { PrismaClient } from '../generated/prisma/client';
const prisma = new PrismaClient();
(async () => {
  const dayScans = await prisma.scanResult.findMany({ where: { style: 'DAY' } });
  const removedSymbols = new Set<string>();
  let updatedScans = 0;

  for (const scan of dayScans) {
    const results = scan.results as any;
    const crypto = results?.crypto ?? [];
    const kept = crypto.filter((s: any) => {
      if (s.patternType === 'TURTLE_SOUP') {
        removedSymbols.add(s.symbol);
        return false;
      }
      return true;
    });
    if (kept.length !== crypto.length) {
      await prisma.scanResult.update({
        where: { id: scan.id },
        data: { results: { ...results, crypto: kept } },
      });
      updatedScans++;
    }
  }

  console.log('Turtle Soup ile kaldirilan semboller:', [...removedSymbols]);
  console.log('Guncellenen ScanResult (style=DAY) sayisi:', updatedScans);

  if (removedSymbols.size > 0) {
    const deleted = await prisma.trackedSignal.deleteMany({
      where: { style: 'DAY', symbol: { in: [...removedSymbols] } },
    });
    console.log('Silinen TrackedSignal (style=DAY, Turtle Soup sembolleri):', deleted.count);
  }

  await prisma.$disconnect();
})();
