import { PrismaClient } from '../generated/prisma/client';
const prisma = new PrismaClient();
(async () => {
  const scanResults = await prisma.scanResult.count({ where: { style: 'DAY' } });
  const trackedSignals = await prisma.trackedSignal.count({ where: { style: 'DAY' } });
  console.log('ScanResult (style=DAY):', scanResults);
  console.log('TrackedSignal (style=DAY):', trackedSignals);
  await prisma.$disconnect();
})();
